import {predict,shift} from './forecast.js';
export const MODELS=['mean4','mean8','mean12','median8','trend8'];
function score(rows,start,end,calendar) {
  const actuals=new Map(rows.map(r=>[r.clinic_date,r.registered_visits]));
  return [1,7,14].map(lead=>{
    const errors=Object.fromEntries(MODELS.map(m=>[m,{absolute:0,signed:0}]));
    let n=0,skipped=0,total=0;
    for(let day=start;day<=end;day=shift(day,1)) {
      const wd=new Date(day+'T00:00:00Z').getUTCDay();
      if(!calendar.open_weekdays.includes(wd)||calendar.closures.some(c=>c.date===day))continue;
      const actual=actuals.get(day),predictions=MODELS.map(m=>predict(rows,day,shift(day,-lead),calendar,m));
      // Compare every model on exactly the same targets.
      if(!Number.isInteger(actual)||actual<=0||predictions.some(p=>p.expected===null)){skipped++;continue;}
      n++;total+=actual;
      MODELS.forEach((m,i)=>{const e=predictions[i].expected-actual;errors[m].absolute+=Math.abs(e);errors[m].signed+=e;});
    }
    return {lead_days:lead,evaluated:n,skipped,models:Object.fromEntries(MODELS.map(m=>[m,{
      mae:n?errors[m].absolute/n:null,bias:n?errors[m].signed/n:null,wape:total?errors[m].absolute/total:null}]))};
  });
}
export function compareModels(rows,asOf,calendar) {
  const developmentStart=shift(asOf,-179),validationStart=shift(asOf,-59);
  const development=score(rows,developmentStart,shift(validationStart,-1),calendar);
  const validation=score(rows,validationStart,asOf,calendar);
  const meanMAE=(results,m)=>results.every(r=>r.models[m].mae!==null)?results.reduce((n,r)=>n+r.models[m].mae,0)/results.length:null;
  const ranked=MODELS.map(model=>({model,mae:meanMAE(development,model)})).filter(x=>x.mae!==null).sort((a,b)=>a.mae-b.mae);
  const selected=ranked[0]?.model??null;
  const reference=meanMAE(validation,'mean8'),candidate=selected?meanMAE(validation,selected):null;
  return {location_id:'Zone3',as_of:asOf,models:MODELS,
    method:'Rolling-origin comparison on common observed open days; current corrected summaries, no historical revision snapshots',
    selection_rule:'Lowest mean MAE across 1-, 7-, 14-day leads on development only; validation never chooses the model',
    development_period:{start:developmentStart,end:shift(validationStart,-1)},validation_period:{start:validationStart,end:asOf},
    development,validation,selected_on_development:selected,
    validation_improvement_fraction:reference&&candidate!==null?(reference-candidate)/reference:null,
    recommendation:'Review validation evidence before changing the default; no automatic promotion',
    future_by_model:Object.fromEntries(MODELS.map(m=>[m,Array.from({length:14},(_,i)=>predict(rows,shift(asOf,i+1),asOf,calendar,m))]))};
}
