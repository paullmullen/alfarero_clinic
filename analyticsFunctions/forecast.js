// Calendar dates in the clinic's America/Guatemala timezone; UTC is date arithmetic only.
export const shift=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const weekday=day=>new Date(day+'T00:00:00Z').getUTCDay();
export function validDay(day) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T00:00:00Z'))&&shift(day,0)===day;
}
export function predict(rows,target,asOf,calendar) {
  const closure=calendar.closures.find(c=>c.date===target&&c.known_on<=asOf);
  if(closure)return {date:target,status:'confirmed_closed',expected:0,low:0,high:0,samples:0};
  if(!calendar.open_weekdays.includes(weekday(target)))return {date:target,status:'scheduled_closed',expected:0,low:0,high:0,samples:0};
  const values=rows.filter(r=>r.clinic_date<=asOf&&r.clinic_date>=shift(asOf,-112)&&weekday(r.clinic_date)===weekday(target)&&
    !calendar.closures.some(c=>c.date===r.clinic_date)&&Number.isInteger(r.registered_visits)&&r.registered_visits>0)
    .sort((a,b)=>a.clinic_date.localeCompare(b.clinic_date)).slice(-8).map(r=>r.registered_visits);
  if(values.length<4)return {date:target,status:'insufficient_history',expected:null,low:null,high:null,samples:values.length};
  const sorted=[...values].sort((a,b)=>a-b);
  return {date:target,status:'baseline',expected:values.reduce((a,b)=>a+b,0)/values.length,
    low:sorted[0],high:sorted.at(-1),samples:values.length};
}
export function baseline(rows,asOf,calendar) {
  const future=Array.from({length:14},(_,i)=>predict(rows,shift(asOf,i+1),asOf,calendar));
  const history=Array.from({length:28},(_,i)=>{
    const date=shift(asOf,i-27),r=rows.find(r=>r.clinic_date===date);
    const closed=calendar.closures.some(c=>c.date===date);
    return {date,actual:r?.registered_visits??(closed?0:null),status:r?'recorded':closed?'confirmed_closed':'unknown'};
  });
  const evaluation=[1,7,14].map(lead=>{
    let n=0,absolute=0,signed=0,actualTotal=0,covered=0,skipped=0;
    for(let date=shift(asOf,-179);date<=asOf;date=shift(date,1)) {
      // Evaluate open-day demand only. Retrospectively confirmed closures are excluded,
      // never converted into advance knowledge in historical predictions.
      if(!calendar.open_weekdays.includes(weekday(date))||calendar.closures.some(c=>c.date===date))continue;
      const actual=rows.find(r=>r.clinic_date===date)?.registered_visits;
      const p=predict(rows,date,shift(date,-lead),calendar);
      if(!Number.isInteger(actual)||actual<=0||p.expected===null){skipped++;continue;}
      n++;absolute+=Math.abs(p.expected-actual);signed+=p.expected-actual;actualTotal+=actual;
      covered+=Number(actual>=p.low&&actual<=p.high);
    }
    return {lead_days:lead,evaluated:n,skipped,mae:n?absolute/n:null,bias:n?signed/n:null,
      wape:actualTotal?absolute/actualTotal:null,range_coverage:n?covered/n:null};
  });
  return {location_id:'Zone3',as_of:asOf,model:'recent_same_weekday_mean_v1',
    range_description:'Min/max of up to eight recent comparable open days; not a calibrated prediction interval',
    evaluation_description:'180-day rolling-origin open-day evaluation using final historical summaries; historical revision snapshots unavailable',
    calendar_assumption:'Open weekdays configured explicitly; unexplained missing days remain unknown',history,future,evaluation};
}
