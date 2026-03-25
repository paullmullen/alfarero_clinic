import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();
const SCANNER_SHARED_TOKEN = defineSecret("SCANNER_SHARED_TOKEN");

const ALLOWED_EVENT_TYPES = ["scan_received"];

export const receiveRoomScanEvent = onRequest(
  { secrets: [SCANNER_SHARED_TOKEN] },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace("Bearer ", "").trim();

      if (token !== SCANNER_SHARED_TOKEN.value()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        visit_id,
        raw_scan_value,
        room_id,
        station_id,
        device_id,
        event_type,
        device_timestamp_utc,
        source_type,
        time_unsynced,
        metadata,
      } = req.body || {};

      if (
        !visit_id ||
        !raw_scan_value ||
        !room_id ||
        !station_id ||
        !device_id ||
        !event_type ||
        !device_timestamp_utc
      ) {
        return res.status(400).json({
          error:
            "Missing required fields: visit_id, raw_scan_value, room_id, station_id, device_id, event_type, device_timestamp_utc",
        });
      }

      if (!ALLOWED_EVENT_TYPES.includes(event_type)) {
        return res.status(400).json({
          error: `Invalid event_type. Allowed values: ${ALLOWED_EVENT_TYPES.join(
            ", ",
          )}`,
        });
      }

      const parsedTimestamp = Date.parse(device_timestamp_utc);
      if (Number.isNaN(parsedTimestamp)) {
        return res.status(400).json({
          error:
            "Invalid device_timestamp_utc. Must be a valid ISO-8601 string.",
        });
      }

      const eventDoc = {
        visit_id,
        raw_scan_value,
        room_id,
        station_id,
        device_id,
        event_type,
        device_timestamp_utc,
        source_type: source_type || "MICRO_SCANNER",
        time_unsynced: time_unsynced === true,
        metadata: metadata || null,

        // resolved/enriched later
        patient_id: null,

        // processing lifecycle
        processing_status: "pending",
        processing_error: null,

        // trusted server receipt time
        received_at: FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("room_events").add(eventDoc);

      return res.status(201).json({
        status: "ok",
        event_id: docRef.id,
      });
    } catch (err) {
      console.error("Error receiving room scan event:", {
        message: err?.message || String(err),
      });

      return res.status(500).json({ error: "Internal server error" });
    }
  },
);
