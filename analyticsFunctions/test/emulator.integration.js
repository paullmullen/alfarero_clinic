import test from 'node:test';import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';import {getFirestore} from 'firebase-admin/firestore';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc} from 'firebase/firestore';
import {syncRecord,backfillPage,rebuildPending,buildQualityReport} from '../store.js';
import {keyFor} from '../normalize.js';

test('real Firestore backfill, corrections, deletion, reports and client rules',async()=>{
 assert.ok(process.env.FIRESTORE_EMULATOR_HOST,'Run through firebase emulators:exec');
 const project='demo-multimedica-analytics';const app=initializeApp({projectId:project});const db=getFirestore(app);
 const env=await initializeTestEnvironment({projectId:project});
 try {
  await env.clearFirestore();
  const p={start_time:new Date('2026-08-19T15:00:00Z'),reason_for_visit:'Consulta',gender:'masculine'};
  await db.collection('patients').doc('a').set(p);
  await db.collection('patients').doc('b').set({...p,location_id:'Other'});
  assert.equal((await backfillPage(db,'patients',1)).included,1);
  assert.equal((await backfillPage(db,'patients',1)).included,0);
  assert.equal((await backfillPage(db,'patients',1)).complete,true);
  await rebuildPending(db);assert.equal((await db.collection('analytics_daily').doc('2026-08-19').get()).data().registered_visits,1);
  assert.equal((await syncRecord(db,'patients','a')).changed,false);
  await db.collection('patients').doc('a').update({start_time:new Date('2026-08-20T15:00:00Z')});await syncRecord(db,'patients','a');
  await rebuildPending(db);assert.equal((await db.collection('analytics_daily').doc('2026-08-19').get()).data().registered_visits,0);
  assert.equal((await db.collection('analytics_daily').doc('2026-08-20').get()).data().registered_visits,1);
  const report=await buildQualityReport(db);assert.equal(report.visits,1);assert.equal(report.pending_days,0);assert.equal(report.backfill_complete,false);
  const client=env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(client,'patients','a')));
  await assertFails(getDoc(doc(client,'analytics_records',keyFor('patients','a'))));
  await assertFails(setDoc(doc(client,'analytics_daily','2026-08-20'),{registered_visits:900}));
  await db.collection('patients').doc('a').delete();await syncRecord(db,'patients','a');await rebuildPending(db);
  assert.equal((await db.collection('analytics_daily').doc('2026-08-20').get()).data().registered_visits,0);
 } finally {await env.cleanup();await deleteApp(app);}
});
