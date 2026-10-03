import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SOURCES } from './normalize.js';
import { backfillPage, rebuildPending, buildQualityReport } from './store.js';
const [command,...args]=process.argv.slice(2);
const option=name=>args.find(a=>a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const project=option('project');
if(!project)throw new Error('Specify --project=PROJECT_ID explicitly.');
if(!['backfill','rebuild','report'].includes(command))throw new Error('Use backfill, rebuild, or report');
const bounded=(name,fallback,max)=>{const v=Number(option(name)??fallback);if(!Number.isInteger(v)||v<1||v>max)throw new Error(`Invalid ${name}`);return v;};
initializeApp({projectId:project,credential:applicationDefault()});const db=getFirestore();
if(command==='backfill') {
  const source=option('source');if(source&&!SOURCES.includes(source))throw new Error('Unknown source');
  for(const collection of source?[source]:SOURCES)for(let page=0;page<bounded('pages',10,10000);page++){
    const result=await backfillPage(db,collection,bounded('batch',100,200));console.log(collection,result);if(result.complete)break;
  }
} else if(command==='rebuild')console.log(await rebuildPending(db,bounded('days',30,500)));
else console.log(JSON.stringify(await buildQualityReport(db),null,2));
