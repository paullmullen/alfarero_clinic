import test from 'node:test';
import assert from 'node:assert/strict';
import {predict,baseline,shift,validDay} from '../forecast.js';
const calendar={open_weekdays:[1,2,3,4,5],closures:[]};
const rows=Array.from({length:160},(_,i)=>({clinic_date:shift('2026-01-01',i),registered_visits:20}));
test('future records cannot affect historical predictions',()=>{
 const before=predict(rows,'2026-05-04','2026-05-03',calendar);
 const changed=rows.map(r=>r.clinic_date>'2026-05-03'?{...r,registered_visits:99999}:r);
 assert.deepEqual(predict(changed,'2026-05-04','2026-05-03',calendar),before);
 assert.equal(before.expected,20);
});
test('retrospective closures do not become advance knowledge',()=>{
 const c={...calendar,closures:[{date:'2026-05-04',known_on:'2026-10-04'}]};
 assert.equal(predict(rows,'2026-05-04','2026-05-03',c).expected,20);
 assert.equal(predict(rows,'2026-05-04','2026-10-04',c).expected,0);
});
test('unknown gaps and context-only zero summaries do not depress demand',()=>{
 assert.equal(predict([],'2026-05-04','2026-05-03',calendar).expected,null);
 assert.equal(predict(rows.map(r=>({...r,registered_visits:0})),'2026-05-04','2026-05-03',calendar).expected,null);
 assert.equal(predict(rows,'2026-05-09','2026-05-03',calendar).expected,0);
});
test('backtest lead times and timeline are deterministic',()=>{
 const report=baseline(rows,'2026-05-30',calendar);
 assert.equal(report.future.length,14);assert.equal(report.history.length,28);
 assert.deepEqual(report.evaluation.map(r=>r.lead_days),[1,7,14]);
 for(const e of report.evaluation){assert.ok(e.evaluated>20);assert.equal(e.mae,0);assert.equal(e.range_coverage,1);}
 assert.equal(report.history.at(-1).actual,20);
});
test('validates calendar dates',()=>{
 assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2026-10-04'),true);
});
