const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const { applyScannerAdvance } = require("../transitions/applyScannerAdvance");
const { writeStatsIfNeeded } = require("../stats/writeStatsIfNeeded");

// Adjust this if your room_events docs use a different field for queryable event time.
// "timestamp" is fine if that is what your ingestion endpoint writes.
// "createdAt" is even better if it is a server timestamp.
const EVENT_TIME_FIELD = "timestamp";

// Start with 3 seconds. If scanners still double-fire, raise to 5.
// I would not start at 60 seconds.
const DUPLICATE_WINDOW_MS = 3000;

function toTimestampOrNull(value) {
  if (!value) return null;

  if (typeof value.toMillis === "function") {
    return value;
  }

  if (value instanceof Date) {
    return admin.firestore.Timestamp.fromDate(value);
  }

  if (typeof value === "number") {
    return admin.firestore.Timestamp.fromMillis(value);
  }

  return null;
}

async function isRecentDuplicateScan({
  eventId,
  visitId,
  station,
  eventTimestamp,
}) {
  const ts = toTimestampOrNull(eventTimestamp);
  if (!ts) {
    return false;
  }

  const windowStart = admin.firestore.Timestamp.fromMillis(
    ts.toMillis() - DUPLICATE_WINDOW_MS,
  );

  const recentSnap = await db
    .collection("room_events")
    .where("visit_id", "==", visitId)
    .where("station", "==", station)
    .where(EVENT_TIME_FIELD, ">=", windowStart)
    .orderBy(EVENT_TIME_FIELD, "desc")
    .limit(5)
    .get();

  const duplicateDoc = recentSnap.docs.find((doc) => doc.id !== eventId);

  return Boolean(duplicateDoc);
}

exports.onRoomEventCreated = onDocumentCreated(
  "room_events/{eventId}",
  async (event) => {
    const snap = event.data;

    if (!snap) {
      logger.warn("onRoomEventCreated fired without snapshot");
      return;
    }

    const roomEvent = snap.data();
    const eventId = snap.id;

    const visitId = roomEvent.visit_id;
    const station = roomEvent.station;

    if (!visitId) {
      logger.error("room_event missing visit_id", { eventId, roomEvent });
      return;
    }

    if (!station) {
      logger.error("room_event missing station", { eventId, roomEvent });
      return;
    }

    const transitionTimestamp =
      roomEvent[EVENT_TIME_FIELD] ||
      (event.time
        ? admin.firestore.Timestamp.fromDate(new Date(event.time))
        : admin.firestore.Timestamp.now());

    // Duplicate-scan suppression:
    // If another event for the same visit + station happened within the recent window,
    // ignore this one.
    const duplicate = await isRecentDuplicateScan({
      eventId,
      visitId,
      station,
      eventTimestamp: transitionTimestamp,
    });

    if (duplicate) {
      logger.warn("Duplicate scanner event suppressed", {
        eventId,
        visitId,
        station,
        duplicateWindowMs: DUPLICATE_WINDOW_MS,
      });
      return;
    }

    const visitRef = db.collection("patients").doc(String(visitId));
    const visitSnap = await visitRef.get();

    if (!visitSnap.exists) {
      logger.warn("visit not found for room_event", {
        eventId,
        visitId,
        station,
      });
      return;
    }

    const visitData = visitSnap.data();

    const result = applyScannerAdvance({
      visitData,
      station,
      timestamp: transitionTimestamp,
      source: "scanner",
    });

    if (!result.changed) {
      logger.info("room_event caused no state change", {
        eventId,
        visitId,
        station,
        reason: result.reason,
      });
      return;
    }

    await visitRef.update({
      plan_of_care: result.updatedPlanOfCare,
    });

    logger.info("visit updated from room_event", {
      eventId,
      visitId,
      station,
      targetStatus: result.targetStatus,
      encounterClosed: result.encounterClosed,
      encounterId: result.encounter?.encounter_id || null,
    });

    if (result.encounterClosed && result.encounter?.encounter_id) {
      await writeStatsIfNeeded({
        visitRef,
        station,
        encounterId: result.encounter.encounter_id,
      });

      logger.info("stats write attempted", {
        eventId,
        visitId,
        station,
        encounterId: result.encounter.encounter_id,
      });
    }
  },
);
