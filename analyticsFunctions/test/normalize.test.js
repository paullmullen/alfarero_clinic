import test from 'node:test';import assert from 'node:assert/strict';
import {normalize,keyFor,millis} from '../normalize.js';import {summarize} from '../summarize.js';
const start='2026-08-19T15:06:12Z';
const episode={status:'complete',closed:true,waiting_start:start,waiting_end:start,waiting_time:0,in_process_start:start,in_process_end:'2026-08-19T15:07:51Z',procedure_time:99};
const patient={start_time:start,stop_time:'2026-08-19T16:56:06Z',location_id:'Zone3',gender:'masculine',age_group:'adult',complete:true,reason_for_visit:'Pie izquierdo lastimado',plan_of_care:[{station:'doc',status:'complete',waiting_time:10000,encounters:[episode,episode]}]};
test('Zone3 aliases and missing/blank locations are included, other locations excluded',()=>{
 for(const id of ['Zone3','Zone 3',undefined,null,' '])assert.equal(normalize('patients',{...patient,location_id:id}).location_id,'Zone3');
 assert.equal(normalize('patients',{...patient,location_id:'Servicios Moviles'}),null);
});
test('timestamps normalize consistently and arrival uses Guatemala day/hour',()=>{
 const ms=Date.parse(start);assert.equal(millis({_seconds:ms/1000,_nanoseconds:0}),ms);assert.equal(millis({toDate:()=>new Date(start)}),ms);
 const v=normalize('patients',patient);assert.equal(v.arrival_hour,9);assert.equal(v.clinic_date,'2026-08-19');assert.equal(v.visit_seconds,6594);
});
test('identity/contact fields omitted, reason and gender retained',()=>{
 const v=normalize('patients',{...patient,patient_name:'Name',national_id_number:'123',tel:'555',guardian_name:'Guardian',pt_no:'id'});
 assert.equal(v.reason,patient.reason_for_visit);assert.equal(v.gender,'masculine');for(const k of ['patient_name','national_id_number','tel','guardian_name','pt_no'])assert.ok(!(k in v));
});
test('encounter history prevents cumulative double counting',()=>{
 const v=normalize('patients',patient),s=summarize(v.clinic_date,[v]);assert.equal(s.stations.doc.waiting_seconds.count,2);assert.equal(s.stations.doc.waiting_seconds.mean,0);assert.equal(s.stations.doc.completed_encounters,2);assert.equal(s.stations.doc.completed_visits,1);
});
test('legacy timing supported, defaults without timestamps remain unmeasured',()=>{
 const v=normalize('patients',{...patient,plan_of_care:[{station:'doc',status:'complete',...episode,encounters:[]},{station:'pha',status:'complete',waiting_time:0,procedure_time:0}]});
 assert.equal(v.stations[0].timing_source,'legacy');assert.equal(v.stations[1].episodes[0].procedure_seconds,null);assert.equal(summarize(v.clinic_date,[v]).stations.pha.procedure_seconds.count,0);
});
test('closed waiting episode is distinct from delivered procedure',()=>{
 const v=normalize('patients',{...patient,plan_of_care:[{station:'doc',status:'complete',encounters:[{...episode,status:'waiting',in_process_start:null,in_process_end:null,procedure_time:null},episode]}]});
 const s=summarize(v.clinic_date,[v]);assert.equal(s.stations.doc.closed_wait_only,1);assert.equal(s.stations.doc.completed_encounters,1);
});
test('appointments exclude explicit other locations and retain unknown scope without identity',()=>{
 assert.equal(normalize('appointments',{location:'Servicios Moviles'}),null);
 const a=normalize('appointments',{appointmentAt:start,createdAt:'2026-08-18T12:00:00Z',admitted_patient_id:'source-id',patientName:'Name',appointmentMatchKey:'contains-name'});
 assert.equal(a.scope,'unknown');assert.equal(a.admitted_visit_key,keyFor('patients','source-id'));assert.ok(!JSON.stringify(a).includes('source-id'));assert.ok(!('patientName' in a));assert.ok(!('appointmentMatchKey' in a));
});
test('partial closure context does not turn unknown days into closed days',()=>{
 const o=normalize('ops_observations',{ymd:'2026-06-03',createdAt:start,typeId:'planned_closure',servicesAffected:['doc'],createdBy:'Name',notes:'Doctor closed'});
 assert.equal(o.scope,'unknown');assert.deepEqual(o.services_affected,['doc']);assert.ok(!('createdBy' in o));assert.equal(summarize(o.clinic_date,[],[o]).operating_status,'unknown');
});
test('invalid dates and missing arrival remain coverage gaps, not zero arrivals',()=>{
 assert.equal(normalize('ops_observations',{ymd:'2026-99-99'}).clinic_date,null);const v=normalize('patients',{...patient,start_time:null});assert.equal(v.clinic_date,null);
});
