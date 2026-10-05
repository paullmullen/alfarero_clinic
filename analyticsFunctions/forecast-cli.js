import {readFile,writeFile} from 'node:fs/promises';
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {baseline,validDay} from './forecast.js';
const args=process.argv.slice(2),option=name=>args.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
const project=option('project'),asOf=option('as-of'),output=option('output');
if(!project||!validDay(asOf??''))throw new Error('Specify --project=PROJECT_ID and --as-of=YYYY-MM-DD (last complete clinic day).');
const calendar=JSON.parse(await readFile(new URL('./zone3-calendar.json',import.meta.url),'utf8'));
initializeApp({projectId:project,credential:applicationDefault()});const db=getFirestore();
const [queue,checkpoints]=await Promise.all([db.collection('analytics_dirty_days').count().get(),db.collection('analytics_ingestion').get()]);
const sources=['patients','appointments','ops_observations','operational_insights','ops_observation_types'];
if(queue.data().count||!sources.every(s=>checkpoints.docs.some(d=>d.id===s&&d.data().complete)))throw new Error('Finish backfill and rebuild pending days before forecasting.');
const daily=await db.collection('analytics_daily').where('clinic_date','<=',asOf).orderBy('clinic_date').get();
const rows=daily.docs.map(d=>d.data()).filter(r=>r.location_id==='Zone3');
if(!rows.length)throw new Error('No Zone3 daily summaries found.');
const report={...baseline(rows,asOf,calendar),latest_activity_date:rows.at(-1).clinic_date,
  generated_at:new Date().toISOString(),summary_documents_read:daily.size};
const json=JSON.stringify(report,null,2);if(output)await writeFile(output,json+'\n');console.log(json);
