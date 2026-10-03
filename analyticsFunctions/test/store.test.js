import test from 'node:test';import assert from 'node:assert/strict';
import {syncRecord,rebuildDay,backfillPage} from '../store.js';import {keyFor} from '../normalize.js';
function fakeDb() {
 const data=new Map();let afterQuery=null;
 const snap=(path)=>({id:path.split('/').at(-1),exists:data.has(path),data:()=>data.get(path)});
 function write(path,value,merge){const out=merge?{...data.get(path)}:{};for(const[k,v]of Object.entries(value)){out[k]=v?.constructor?.name==='NumericIncrementTransform'?(out[k]??0)+v.operand:v?.constructor?.name==='ServerTimestampTransform'?123:v;}data.set(path,out);}
 const ref=path=>({path,id:path.split('/').at(-1),get:async()=>snap(path),set:async(v,o)=>write(path,v,o?.merge)});
 const db={data,setAfterQuery:f=>afterQuery=f,collection:name=>{
  const q={filters:[],n:Infinity,cursor:null,doc:id=>ref(`${name}/${id}`),where(field,op,value){this.filters.push([field,value]);return this;},orderBy(){return this;},select(){return this;},limit(n){this.n=n;return this;},startAfter(cursor){this.cursor=cursor;return this;},async get(){const docs=[...data.keys()].filter(p=>p.startsWith(name+'/')).sort().map(snap).filter(d=>(!this.cursor||d.id>this.cursor)&&this.filters.every(([k,v])=>d.data()[k]===v)).slice(0,this.n);if(afterQuery){const f=afterQuery;afterQuery=null;f();}return{docs,size:docs.length};}};return q;},runTransaction:async f=>{const writes=[];const tx={get:async r=>snap(r.path),set:(r,v,o)=>writes.push(()=>write(r.path,v,o?.merge)),delete:r=>writes.push(()=>data.delete(r.path))};const result=await f(tx);for(const w of writes)w();return result;}};
 return db;
}
const patient={start_time:'2026-08-19T15:00:00Z',location_id:'Zone3',gender:'masculine'};
test('retry and unordered trigger invocations converge without duplicate counts',async()=>{
 const db=fakeDb();db.data.set('patients/a',patient);await syncRecord(db,'patients','a');
 const key='analytics_records/'+keyFor('patients','a');db.data.set(key,Object.fromEntries(Object.entries(db.data.get(key)).reverse()));
 assert.equal((await syncRecord(db,'patients','a')).changed,false);assert.equal(db.data.get('analytics_dirty_days/2026-08-19').generation,1);
 await rebuildDay(db,'2026-08-19');assert.equal(db.data.get('analytics_daily/2026-08-19').registered_visits,1);
});
test('date correction dirties both days; moving to another location removes projection',async()=>{
 const db=fakeDb();db.data.set('patients/a',patient);await syncRecord(db,'patients','a');
 db.data.set('patients/a',{...patient,start_time:'2026-08-20T15:00:00Z'});await syncRecord(db,'patients','a');
 assert.ok(db.data.has('analytics_dirty_days/2026-08-19'));assert.ok(db.data.has('analytics_dirty_days/2026-08-20'));
 db.data.set('patients/a',{...patient,location_id:'Other'});await syncRecord(db,'patients','a');assert.ok(!db.data.has('analytics_records/'+keyFor('patients','a')));
});
test('source deletion removes projection and rebuild clears prior total',async()=>{
 const db=fakeDb();db.data.set('patients/a',patient);await syncRecord(db,'patients','a');await rebuildDay(db,'2026-08-19');db.data.delete('patients/a');await syncRecord(db,'patients','a');await rebuildDay(db,'2026-08-19');assert.equal(db.data.get('analytics_daily/2026-08-19').registered_visits,0);
});
test('a concurrent dirty generation prevents publishing stale summary',async()=>{
 const db=fakeDb();db.data.set('patients/a',patient);await syncRecord(db,'patients','a');
 db.setAfterQuery(()=>db.data.get('analytics_dirty_days/2026-08-19').generation++);
 assert.equal(await rebuildDay(db,'2026-08-19'),false);assert.ok(db.data.has('analytics_dirty_days/2026-08-19'));assert.ok(!db.data.has('analytics_daily/2026-08-19'));
});
test('backfill resumes after cursor; replay does not duplicate projections',async()=>{
 const db=fakeDb();for(const id of ['a','b','c'])db.data.set('patients/'+id,patient);
 assert.equal((await backfillPage(db,'patients',2)).scanned,2);assert.equal((await backfillPage(db,'patients',2)).scanned,1);assert.equal((await backfillPage(db,'patients',2)).scanned,0);assert.equal(db.data.get('analytics_ingestion/patients').scanned,3);
 assert.equal([...db.data.keys()].filter(k=>k.startsWith('analytics_records/')).length,3);
});
