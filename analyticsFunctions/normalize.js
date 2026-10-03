import { createHash } from 'node:crypto';
export const VERSION = 1;
export const SOURCES = ['patients', 'appointments', 'ops_observations', 'operational_insights', 'ops_observation_types'];
export const keyFor = (collection, id) => createHash('sha256').update(`${collection}/${id}`).digest('hex');
export function millis(value) {
  if (value == null || value === '') return null;
  let ms;
  if (value instanceof Date) ms = value.getTime();
  else if (typeof value.toMillis === 'function') ms = value.toMillis();
  else if (typeof value.toDate === 'function') ms = value.toDate().getTime();
  else if (typeof (value.seconds ?? value._seconds) === 'number') ms = (value.seconds ?? value._seconds)*1000 + (value.nanoseconds ?? value._nanoseconds ?? 0)/1e6;
  else if (typeof value === 'string' || typeof value === 'number') ms = new Date(value).getTime();
  return Number.isFinite(ms) ? Math.floor(ms) : null;
}
const formatter = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
export function clinicParts(value) {
  const ms = millis(value); if (ms === null) return {day:null,hour:null};
  const parts = Object.fromEntries(formatter.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
  return {day:`${parts.year}-${parts.month}-${parts.day}`,hour:Number(parts.hour)};
}
const text = v => typeof v === 'string' ? v.trim() : null;
const duration = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
const validDay = v => { if(typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v))return false; const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v; };
export function isZone3(value, legacy = false) {
  const id = text(value);
  return (!id && legacy) || ['Zone3','Zone 3','Clínica Alfarero Z3'].includes(id);
}
function timing(e) {
  const start=millis(e.waiting_start), end=millis(e.waiting_end);
  const procedureStart=millis(e.in_process_start), procedureEnd=millis(e.in_process_end);
  return {status:text(e.status),closed:e.closed === true,waiting_start:start,waiting_end:end,
    in_process_start:procedureStart,in_process_end:procedureEnd,
    // Zero defaults without supporting timestamps are not measured samples.
    waiting_seconds:start !== null && end !== null ? duration(e.waiting_time) : null,
    procedure_seconds:procedureStart !== null && procedureEnd !== null ? duration(e.procedure_time) : null};
}
export function normalize(collection, data) {
  if (!data) return null;
  if (collection === 'patients') {
    if (!isZone3(data.location_id,true)) return null;
    const arrival=clinicParts(data.start_time);
    const stations=(Array.isArray(data.plan_of_care)?data.plan_of_care:[]).filter(Boolean).map(s=>{
      const hasEncounters=Array.isArray(s.encounters)&&s.encounters.length>0;
      return {station:text(s.station),status:text(s.status),route_order:s.route_order ?? null,
        timing_source:hasEncounters?'encounters':'legacy',
        episodes:(hasEncounters?s.encounters:[s]).filter(Boolean).map(timing)};
    });
    const start=millis(data.start_time),stop=millis(data.stop_time);
    return {version:VERSION,kind:'visit',location_id:'Zone3',legacy_location:!text(data.location_id),
      clinic_date:arrival.day,arrival_hour:arrival.hour,start_time:start,stop_time:stop,
      visit_seconds:start !== null && stop !== null && stop >= start ? (stop-start)/1000:null,
      complete:data.complete===true,gender:text(data.gender),age_group:text(data.age_group),
      new_patient:typeof data.new_patient==='boolean'?data.new_patient:null,
      visit_type:text(data.type_of_visit),reason:text(data.reason_for_visit),stations};
  }
  if (collection === 'ops_observation_types') return {version:VERSION,kind:'observation_type',
    active:data.active!==false,category:text(data.category),impact:text(data.impact),label_key:text(data.labelKey)};
  const location=data.location_id ?? data.location;
  // Missing context location is retained as unknown, not silently attributed.
  if (text(location) && !isZone3(location)) return null;
  const scope=text(location)?'Zone3':'unknown';
  if (collection === 'appointments') {
    const scheduled=clinicParts(data.appointmentAt);
    return {version:VERSION,kind:'appointment',scope,clinic_date:scheduled.day,
      scheduled_at:millis(data.appointmentAt),scheduled_hour:scheduled.hour,created_at:millis(data.createdAt),
      status:text(data.status),gender:text(data.gender),age_group:text(data.ageGroup),
      visit_type:text(data.visitType),reason:text(data.reasonForVisit),
      admitted_visit_key:data.admitted_patient_id?keyFor('patients',data.admitted_patient_id):null,
      admitted_at:millis(data.admittedAt),date_text:text(data.appointmentDateText),time_text:text(data.appointmentTimeText)};
  }
  if (collection === 'ops_observations') return {version:VERSION,kind:'observation',scope,
    clinic_date:validDay(data.ymd)?data.ymd:clinicParts(data.date).day,
    created_at:millis(data.createdAt),event_at:millis(data.date),type_id:text(data.typeId),
    category:text(data.category),notes:text(data.notes),services_affected:Array.isArray(data.servicesAffected)?data.servicesAffected:[]};
  if (collection === 'operational_insights') return {version:VERSION,kind:'derived_insight',scope,
    clinic_date:validDay(data.clinic_date)?data.clinic_date:clinicParts(data.date).day,
    detected_at:millis(data.detected_at),type:text(data.type),station:text(data.station),
    severity:text(data.severity),title:text(data.title),explanation:text(data.explanation),
    metrics:{baseline:typeof data.metrics?.baseline==='number'?data.metrics.baseline:null,
      today:typeof data.metrics?.today==='number'?data.metrics.today:null,
      hour:typeof data.metrics?.hour==='number'?data.metrics.hour:null}};
  throw new Error(`Unsupported collection: ${collection}`);
}
