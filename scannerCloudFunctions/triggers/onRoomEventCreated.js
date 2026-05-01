import admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

import { applyScannerEventAdapter } from "../transitions/applyScannerEventAdapter.js";
import { writeStatsIfNeeded } from "../stats/writeStatsIfNeeded.js";
import { getScannerRuntimeConfig } from "../config/getScannerRuntimeConfig.js";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const EVENT_TIME_FIELD = "received_at";

/**
 * Safely normalize timestamps
 */
function toTimestampOrNull(value) {
  if (!value) return null;

  if (typeof value.toMillis === "function") return value;
  if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
  if (typeof value === "number")
    return admin.firestore.Timestamp.fromMillis(value);

  return null;
}

/**
 * Mark processing status on room_event
 */
async function markRoomEvent(eventRef, updates = {}) {
  await eventRef.set(
    {
      ...updates,
      processed_at: admin.firestore.Timestamp.now(),
    },
    { merge: true },
  );
}

/**
 * Duplicate scan suppression
 */
async function isRecentDuplicateScan({
  eventId,
  visitId,
  stationId,
  eventTimestamp,
  duplicateWindowMs,
}) {
  const ts = toTimestampOrNull(eventTimestamp);
  if (!ts) return false;

  const windowStart = admin.firestore.Timestamp.fromMillis(
    ts.toMillis() - duplicateWindowMs,
  );

  const recentSnap = await db
    .collection("room_events")
    .where("visit_id", "==", visitId)
    .where("station_id", "==", stationId)
    .where(EVENT_TIME_FIELD, ">=", windowStart)
    .orderBy(EVENT_TIME_FIELD, "desc")
    .limit(5)
    .get();

  const duplicateDoc = recentSnap.docs.find((doc) => doc.id !== eventId);

  return Boolean(duplicateDoc);
}

/**
 * Main trigger
 */
export const onRoomEventCreated = onDocumentCreated(
  "room_events/{eventId}",
  async (event) => {
    const snap = event.data;

    if (!snap) {
      logger.warn("onRoomEventCreated fired without snapshot");
      return;
    }

    const roomEvent = snap.data();
    const eventId = snap.id;
    const eventRef = snap.ref;

    if (
      roomEvent.processing_status === "resolved" ||
      roomEvent.processing_status === "processing_by_receiveRoomScanEvent" ||
      roomEvent.processed_by === "receiveRoomScanEvent"
    ) {
      logger.info(
        "room_event handled by receiveRoomScanEvent; skipping trigger",
        {
          eventId,
          processing_status: roomEvent.processing_status,
          processed_by: roomEvent.processed_by || null,
        },
      );
      return;
    }

    // NOTE: visit_id is actually pt_no (visit key)
    const visitId = roomEvent.visit_id;
    const stationId = roomEvent.station_id;
    const receivedAt = roomEvent.received_at;

    if (!visitId) {
      logger.error("room_event missing visit_id", { eventId });

      await markRoomEvent(eventRef, {
        processing_status: "error",
        processing_error: "missing_visit_id",
      });
      return;
    }

    if (!stationId) {
      logger.error("room_event missing station_id", { eventId });

      await markRoomEvent(eventRef, {
        processing_status: "error",
        processing_error: "missing_station_id",
      });
      return;
    }

    const runtimeConfig = await getScannerRuntimeConfig();
    const duplicateWindowMs = runtimeConfig.duplicate_scan_window_ms;

    const transitionTimestamp =
      toTimestampOrNull(receivedAt) || admin.firestore.Timestamp.now();

    try {
      const duplicate = await isRecentDuplicateScan({
        eventId,
        visitId,
        stationId,
        eventTimestamp: transitionTimestamp,
        duplicateWindowMs,
      });

      if (duplicate) {
        logger.warn("Duplicate scan suppressed", {
          eventId,
          visitId,
          stationId,
          duplicateWindowMs,
        });

        await markRoomEvent(eventRef, {
          processing_status: "ignored_duplicate",
          processing_error: null,
        });
        return;
      }

      const visitRef = db.collection("patients").doc(String(visitId));
      const visitSnap = await visitRef.get();

      if (!visitSnap.exists) {
        logger.warn("visit not found", {
          eventId,
          visitId,
          stationId,
        });

        await markRoomEvent(eventRef, {
          processing_status: "error",
          processing_error: "visit_not_found",
        });
        return;
      }

      const visitData = visitSnap.data();

      const result = applyScannerEventAdapter({
        visitData,
        station: stationId,
        timestamp: transitionTimestamp,
        source: "scanner",
      });

      console.log("[DEBUG] Transition result: " + JSON.stringify(result));

      if (!result.changed) {
        logger.info("No state change", {
          eventId,
          visitId,
          stationId,
          reason: result.reason,
        });

        await markRoomEvent(eventRef, {
          processing_status: "noop",
          processing_error: null,
        });
        return;
      }

      await visitRef.update({
        plan_of_care: result.updatedPlanOfCare,
      });

      logger.info("Visit updated", {
        eventId,
        visitId,
        stationId,
        newStatus: result.targetStatus,
        encounterClosed: result.encounterClosed,
        encounterId: result.encounter?.encounter_id || null,
        statsStation: result.statsStation || null,
      });

      if (result.encounterClosed && result.encounter?.encounter_id) {
        await writeStatsIfNeeded({
          visitRef,
          station: result.statsStation || stationId,
          encounterId: result.encounter.encounter_id,
        });

        logger.info("Stats updated", {
          eventId,
          visitId,
          stationId,
          statsStation: result.statsStation || stationId,
          encounterId: result.encounter.encounter_id,
        });
      }

      await markRoomEvent(eventRef, {
        processing_status: "resolved",
        processing_error: null,
      });
    } catch (error) {
      logger.error("Error processing room_event", {
        eventId,
        visitId,
        stationId,
        message: error.message,
      });

      await markRoomEvent(eventRef, {
        processing_status: "error",
        processing_error: error.message,
      });

      throw error;
    }
  },
);
