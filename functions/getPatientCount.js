//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

import { onRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const ALL_LOCATIONS_ID = "__ALL__";

export const getPatientCount = onRequest(
  {
    region: "us-central1",
    cors: [
      /localhost(:\d+)?$/,
      "https://multimedica.org",
      "https://alfarero-478ad--test-712c1z2l.web.app",
    ],
    methods: ["POST", "OPTIONS"],
  },
  async (req, res) => {
    try {
      // CORS preflight
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const { database, startTimestamp, endTimestamp, locationId } = req.body;

      console.log("Received Request Data:", {
        database,
        startTimestamp,
        endTimestamp,
        locationId,
      });

      if (!startTimestamp?.seconds || !endTimestamp?.seconds) {
        return res.status(400).send("Missing startTimestamp/endTimestamp");
      }

      const db = admin.firestore();

      const start = new admin.firestore.Timestamp(startTimestamp.seconds, 0);
      const end = new admin.firestore.Timestamp(endTimestamp.seconds, 0);

      let q = db
        .collection("patients")
        .where("start_time", ">=", start)
        .where("start_time", "<=", end);

      if (locationId && locationId !== ALL_LOCATIONS_ID) {
        q = q.where("location_id", "==", locationId);
      }

      const snapshot = await q.get();

      return res.status(200).json({ records: snapshot.size });
    } catch (error) {
      console.error("Error fetching patients data:", error);
      return res.status(500).send("Internal Server Error");
    }
  },
);
