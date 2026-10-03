import { keyFor, normalize, SOURCES } from './normalize.js';
import { summarize } from './summarize.js';
import { FieldValue, FieldPath } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export async function syncRecord(db, collection, id) {
  const source=db.collection(collection).doc(id);
  const target=db.collection('analytics_records').doc(keyFor(collection,id));
  return db.runTransaction(async tx=>{
    // Read current source, not trigger payload: repeated/out-of-order events converge.
    const [current,previous]=await Promise.all([tx.get(source),tx.get(target)]);
    let next=normalize(collection,current.exists?current.data():null);
    if(next&&collection==='ops_observation_types')next={...next,type_id:id};
    const prior=previous.exists?previous.data():null;
    if(isDeepStrictEqual(prior,next))return {changed:false,included:next!==null};
    if(next)tx.set(target,next);else if(previous.exists)tx.delete(target);
    for(const day of new Set([prior?.clinic_date,next?.clinic_date].filter(Boolean))) {
      tx.set(db.collection('analytics_dirty_days').doc(day),
        {generation:FieldValue.increment(1),changed_at:FieldValue.serverTimestamp()},{merge:true});
    }
    return {changed:true,included:next!==null};
  });
}

export async function rebuildDay(db, day) {
  const dirtyRef=db.collection('analytics_dirty_days').doc(day);
  const initial=await dirtyRef.get();if(!initial.exists)return false;
  const generation=initial.data().generation;
  const records=await db.collection('analytics_records').where('clinic_date','==',day).get();
  const rows=records.docs.map(d=>d.data());
  const summary=summarize(day,rows.filter(r=>r.kind==='visit'),rows.filter(r=>r.kind!=='visit'));
  return db.runTransaction(async tx=>{
    const current=await tx.get(dirtyRef);
    if(!current.exists||current.data().generation!==generation)return false;
    tx.set(db.collection('analytics_daily').doc(day),{...summary,built_at:FieldValue.serverTimestamp()});
    tx.delete(dirtyRef);return true;
  });
}
export async function rebuildPending(db, limit=30) {
  const dirty=await db.collection('analytics_dirty_days').orderBy(FieldPath.documentId()).limit(limit).get();
  let rebuilt=0;for(const doc of dirty.docs)rebuilt+=Number(await rebuildDay(db,doc.id));
  return {examined:dirty.size,rebuilt};
}

export async function backfillPage(db, collection, batchSize=100) {
  if(!SOURCES.includes(collection))throw new Error('Unsupported source');
  const ref=db.collection('analytics_ingestion').doc(collection);
  const owner=randomUUID();
  const checkpoint=await db.runTransaction(async tx=>{
    const s=await tx.get(ref),state=s.exists?s.data():{};
    if(state.complete)return null;
    if(state.lease_until>Date.now())throw new Error('Backfill already running for '+collection);
    tx.set(ref,{lease_owner:owner,lease_until:Date.now()+300000},{merge:true});return state;
  });
  if(checkpoint===null)return {complete:true,scanned:0};
  try {
    let query=db.collection(collection).orderBy(FieldPath.documentId()).select().limit(batchSize);
    if(checkpoint.cursor)query=query.startAfter(checkpoint.cursor);
    const page=await query.get();let included=0;
    for(const doc of page.docs)included+=Number((await syncRecord(db,collection,doc.id)).included);
    await db.runTransaction(async tx=>{
      const state=await tx.get(ref);if(state.data().lease_owner!==owner)throw new Error('Backfill lease changed; retry page');
      tx.set(ref,{cursor:page.docs.at(-1)?.id??checkpoint.cursor??null,
        complete:page.size<batchSize,scanned:FieldValue.increment(page.size),included:FieldValue.increment(included),
        lease_owner:null,lease_until:0,updated_at:FieldValue.serverTimestamp()},{merge:true});
    });
    return {complete:page.size<batchSize,scanned:page.size,included};
  } catch(error) {
    // Cursor remains at last committed page; replay is safe.
    await db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.data()?.lease_owner===owner)tx.set(ref,{lease_owner:null,lease_until:0},{merge:true});});
    throw error;
  }
}
export async function buildQualityReport(db) {
  const [daily,missing,queue,checkpoints]=await Promise.all([
    db.collection('analytics_daily').orderBy('clinic_date').get(),
    db.collection('analytics_records').where('clinic_date','==',null).count().get(),
    db.collection('analytics_dirty_days').count().get(),
    db.collection('analytics_ingestion').get(),
  ]);
  const days=daily.docs.map(d=>d.data());const present=new Set(days.map(d=>d.clinic_date));
  const gaps=[];
  if(days.length)for(let ms=Date.parse(days[0].clinic_date+'T00:00:00Z');ms<=Date.parse(days.at(-1).clinic_date+'T00:00:00Z');ms+=86400000){const day=new Date(ms).toISOString().slice(0,10);if(!present.has(day))gaps.push(day);}
  const state=Object.fromEntries(checkpoints.docs.map(d=>[d.id,d.data()]));
  const report={backfill_complete:SOURCES.every(c=>state[c]?.complete===true),source_progress:Object.fromEntries(SOURCES.map(c=>[c,{complete:state[c]?.complete===true,scanned:state[c]?.scanned??0,included:state[c]?.included??0}])),location_id:'Zone3',days:days.length,first_day:days[0]?.clinic_date??null,last_day:days.at(-1)?.clinic_date??null,
    visits:days.reduce((n,d)=>n+d.registered_visits,0),legacy_location_visits:days.reduce((n,d)=>n+d.coverage.legacy_location_visits,0),
    first_day_with_encounters:days.find(d=>d.coverage.visits_with_encounters>0)?.clinic_date??null,
    visits_with_encounters:days.reduce((n,d)=>n+d.coverage.visits_with_encounters,0),
    visits_with_reason:days.reduce((n,d)=>n+d.coverage.visits_with_reason,0),
    undated_records:missing.data().count,pending_days:queue.data().count,
    unknown_gap_days:gaps,built_at:FieldValue.serverTimestamp()};
  await db.collection('analytics_reports').doc('Zone3').set(report);return {...report,built_at:undefined};
}
