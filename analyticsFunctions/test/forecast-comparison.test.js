import test from 'node:test';
import assert from 'node:assert/strict';
import {compareModels} from '../forecast-comparison.js';
import {shift,predict} from '../forecast.js';
const calendar={open_weekdays:[1,2,3,4,5],closures:[]};
const rows=Array.from({length:365},(_,i)=>({clinic_date:shift('2025-10-03',i),registered_visits:30+i%11}));
test('validation outcomes cannot influence model selection',()=>{
 const a=compareModels(rows,'2026-10-02',calendar);
 const altered=rows.map(r=>r.clinic_date>=a.validation_period.start?{...r,registered_visits:900}:r);
 const b=compareModels(altered,'2026-10-02',calendar);
 assert.deepEqual(a.development,b.development);assert.equal(a.selected_on_development,b.selected_on_development);
 assert.notDeepEqual(a.validation,b.validation);
});
test('all model errors use common targets and handle absent history',()=>{
 const a=compareModels(rows,'2026-10-02',calendar);
 for(const period of [a.development,a.validation])for(const lead of period){assert.ok(lead.evaluated>30);assert.equal(Object.keys(lead.models).length,5);}
 assert.equal(compareModels([],'2026-10-02',calendar).selected_on_development,null);
});
test('median tolerates a single low observation without removing it',()=>{
 const mondays=Array.from({length:8},(_,i)=>({clinic_date:shift('2026-08-10',i*7),registered_visits:i===7?10:50}));
 assert.equal(predict(mondays,'2026-10-05','2026-10-02',calendar,'median8').expected,50);
 assert.equal(predict(mondays,'2026-10-05','2026-10-02',calendar,'mean8').expected,45);
 assert.throws(()=>predict(rows,'2026-10-05','2026-10-02',calendar,'bad'));
});
