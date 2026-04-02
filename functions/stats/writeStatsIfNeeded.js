/**
 * ⚠️ MIRRORED FILE
 *
 * This file is intentionally duplicated from:
 * scannerCloudFunctions/stats/writeStatsIfNeeded.js
 *
 * Reason:
 * - Avoid cross-codebase imports between scanner and api functions
 * - Keep deployment simple and reliable
 *
 * If you update logic here, update the scanner copy as well.
 */

import admin from "firebase-admin";

const db = admin.firestore();
const { FieldValue } = admin.firestore;

export async function writeStatsIfNeeded({ visitRef, station, encounterId }) {
  const statsRef = db.collection("stats").doc(station);

  await db.runTransaction(async (tx) => {
    const visitSnap = await tx.get(visitRef);
    if (!visitSnap.exists) {
      throw new Error("visit_not_found_during_stats_write");
    }

    const visitData = visitSnap.data();
    const planOfCare = Array.isArray(visitData.plan_of_care)
      ? [...visitData.plan_of_care]
      : [];

    const stationIndex = planOfCare.findIndex(
      (step) => step.station === station,
    );
    if (stationIndex === -1) {
      throw new Error(`station_not_found_in_visit:${station}`);
    }

    const stationEntry = {
      ...planOfCare[stationIndex],
      encounters: Array.isArray(planOfCare[stationIndex].encounters)
        ? [...planOfCare[stationIndex].encounters]
        : [],
    };

    const encounterIndex = stationEntry.encounters.findIndex(
      (enc) => enc.encounter_id === encounterId,
    );

    if (encounterIndex === -1) {
      throw new Error(`encounter_not_found:${encounterId}`);
    }

    const encounter = {
      ...stationEntry.encounters[encounterIndex],
    };

    if (encounter.closed !== true) {
      return;
    }

    if (encounter.stats_recorded === true) {
      return;
    }

    const statsUpdates = {};

    if (encounter.procedure_time != null) {
      statsUpdates.procedure_time_data = FieldValue.arrayUnion(
        encounter.procedure_time,
      );
    }

    if (encounter.waiting_time != null) {
      statsUpdates.waiting_time_data = FieldValue.arrayUnion(
        encounter.waiting_time,
      );
    }

    if (Object.keys(statsUpdates).length > 0) {
      tx.set(statsRef, statsUpdates, { merge: true });
    }

    encounter.stats_recorded = true;
    stationEntry.encounters[encounterIndex] = encounter;
    planOfCare[stationIndex] = stationEntry;

    tx.update(visitRef, {
      plan_of_care: planOfCare,
    });
  });
}
