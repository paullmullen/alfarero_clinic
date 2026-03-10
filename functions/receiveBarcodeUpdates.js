import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = getFirestore();

// Load secret from Secret Manager
const SHARED_TOKEN = defineSecret("SCANNER_SHARED_TOKEN");

export const receiveBarcodeUpdates = onRequest(
  { secrets: [SHARED_TOKEN] },
  async (req, res) => {
    try {
      // --- 1. Enforce POST ---
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      // --- 2. Validate Authorization header ---
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace("Bearer ", "").trim();

      if (token !== SHARED_TOKEN.value()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // --- 3. Validate JSON body ---
      const {
        patient_id,
        room_id,
        event_type,
        timestamp_utc,
        station_id,
        source_type,
        time_unsynced,
      } = req.body || {};

      if (!patient_id || !room_id || !event_type || !timestamp_utc) {
        return res.status(400).json({
          error:
            "Missing required fields: patient_id, room_id, event_type, timestamp_utc",
        });
      }

      // --- 4. Build Firestore document ---
      const eventDoc = {
        patient_id,
        room_id,
        event_type,
        timestamp_utc,
        station_id: station_id || null,
        source_type: source_type || "MICRO_SCANNER",
        time_unsynced: time_unsynced || false,
        received_at: FieldValue.serverTimestamp(),
      };

      // --- 5. Write to Firestore ---
      const docRef = await db.collection("room_events").add(eventDoc);

      // --- 6. Respond to client ---
      return res.status(201).json({
        status: "ok",
        event_id: docRef.id,
      });
    } catch (err) {
      console.error("Error receiving scanner event:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);
