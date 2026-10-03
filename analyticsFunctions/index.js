import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { syncRecord, rebuildPending } from './store.js';
if(!getApps().length)initializeApp();
const db=getFirestore();
const trigger=collection=>onDocumentWritten({document:`${collection}/{id}`,retry:true},event=>syncRecord(db,collection,event.params.id));
export const analyticsPatientChanged=trigger('patients');
export const analyticsAppointmentChanged=trigger('appointments');
export const analyticsObservationChanged=trigger('ops_observations');
export const analyticsInsightChanged=trigger('operational_insights');
export const analyticsObservationTypeChanged=trigger('ops_observation_types');
export const analyticsRebuildDays=onSchedule({schedule:'every 15 minutes',timeZone:'America/Guatemala',timeoutSeconds:540},async()=>{
  console.log('Analytics summary rebuild',await rebuildPending(db));
});
