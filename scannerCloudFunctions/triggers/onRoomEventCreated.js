import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

export const onRoomEventCreated = onDocumentCreated(
  "room_events/{eventId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const eventId = event.params.eventId;
    const data = snapshot.data();

    const { visit_id } = data;

    // Defensive: ensure visit_id exists
    if (!visit_id) {
      await markException(eventId, "missing_visit_id");
      return;
    } else {
      console.log("Processing room event for visit_id:", visit_id);
    }

    try {
      // NOTE:
      // Visit records are currently stored in the historical "patients" collection.
      // visit_id (event) maps to pt_no (patients collection)
      const visitQuery = await db
        .collection("patients")
        .where("pt_no", "==", visit_id)
        .limit(1)
        .get();

      if (visitQuery.empty) {
        await markException(eventId, "visit_not_found");
        return;
      }

      const visitDoc = visitQuery.docs[0];
      const visitData = visitDoc.data();

      const patient_id =
        visitData.patient_id || visitData.national_id || visitData.dpi || null;

      await db
        .collection("room_events")
        .doc(eventId)
        .update({
          patient_id: patient_id || null,
          processing_status: "resolved",
          processing_error: null,
          processed_at: FieldValue.serverTimestamp(),
        });
    } catch (err) {
      console.error("Error processing room event:", {
        eventId,
        message: err?.message || String(err),
      });

      await markException(eventId, "processing_error", err?.message);
    }
  },
);

// --- helper ---

async function markException(eventId, code, message = null) {
  const db = getFirestore();

  await db
    .collection("room_events")
    .doc(eventId)
    .update({
      processing_status: "exception",
      processing_error: {
        code,
        message: message || null,
      },
      processed_at: FieldValue.serverTimestamp(),
    });
}
