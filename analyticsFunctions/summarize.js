import { VERSION, clinicParts } from './normalize.js';
function distribution(values) {
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  const percentile=p=>sorted.length?sorted[Math.floor((sorted.length-1)*p)]:null;
  return {count:sorted.length,mean:sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:null,
    median:percentile(.5),p90:percentile(.9),max:sorted.at(-1)??null};
}
export function summarize(day, visits, context=[]) {
  const arrivals=Array(24).fill(0),stations=Object.create(null),gender=Object.create(null),age=Object.create(null),types=Object.create(null);
  let completed=0,legacyLocations=0,encounterVisits=0,reasonCount=0;
  for (const v of visits) {
    if (Number.isInteger(v.arrival_hour)) arrivals[v.arrival_hour]++;
    completed+=Number(v.complete);legacyLocations+=Number(v.legacy_location);
    encounterVisits+=Number(v.stations.some(s=>s.timing_source==='encounters'));
    reasonCount+=Number(Boolean(v.reason));
    for(const [map,key] of [[gender,v.gender],[age,v.age_group],[types,v.visit_type]])map[key||'unknown']=(map[key||'unknown']||0)+1;
    for (const s of v.stations) {
      const bucket=stations[s.station||'unknown']??={completed_visits:0,completed_encounters:0,closed_wait_only:0,
        legacy_steps:0,encounter_steps:0,waiting:[],procedure:[],waiting_by_hour:Array.from({length:24},()=>[])};
      bucket.completed_visits+=Number(s.status==='complete');
      bucket[s.timing_source==='encounters'?'encounter_steps':'legacy_steps']++;
      for(const e of s.episodes) {
        bucket.closed_wait_only+=Number(e.closed&&e.status==='waiting'&&e.in_process_start===null);
        if(e.status!=='complete') continue;
        bucket.completed_encounters+=Number(s.timing_source==='encounters');
        if(e.waiting_seconds!==null){bucket.waiting.push(e.waiting_seconds);const hour=clinicParts(e.waiting_start).hour;if(hour!==null)bucket.waiting_by_hour[hour].push(e.waiting_seconds);}
        if(e.procedure_seconds!==null)bucket.procedure.push(e.procedure_seconds);
      }
    }
  }
  const stationSummary=Object.fromEntries(Object.entries(stations).map(([s,b])=>[s,{
    completed_visits:b.completed_visits,completed_encounters:b.completed_encounters,closed_wait_only:b.closed_wait_only,
    legacy_steps:b.legacy_steps,encounter_steps:b.encounter_steps,
    waiting_seconds:distribution(b.waiting),procedure_seconds:distribution(b.procedure),
    waiting_by_hour:b.waiting_by_hour.map(distribution)}]));
  return {version:VERSION,location_id:'Zone3',clinic_date:day,registered_visits:visits.length,
    completed_visits:completed,arrivals_by_hour:arrivals,gender,age_groups:age,visit_types:types,
    visit_seconds:distribution(visits.map(v=>v.visit_seconds)),stations:stationSummary,
    coverage:{legacy_location_visits:legacyLocations,visits_with_encounters:encounterVisits,
      visits_with_reason:reasonCount,visits_with_duration:visits.filter(v=>v.visit_seconds!==null).length},
    operating_status:visits.length?'activity_recorded':'unknown',
    // Context is evidence, not a numeric correction or automatic closure rule.
    context_counts:context.reduce((a,c)=>{const key=`${c.kind}:${c.scope??'n/a'}`;a[key]=(a[key]||0)+1;return a;},{})};
}
