//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

import { onRequest } from "firebase-functions/v2/https";
import corsFactory from "cors";

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Safe Admin initialization
if (!getApps().length) {
  initializeApp();
}

const corsHandler = corsFactory({
  origin: [
    /^http:\/\/localhost(:\d+)?$/,
    /^https:\/\/localhost(:\d+)?$/,
    "https://multimedica.org",
    "https://alfarero-478ad--expire-o4gpaz9l.web.app",
  ],
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 3600,
});

export const fetchPatientsData = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") return res.status(204).send("");

    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { dateRange, database, include_completed } = req.body;

      // optional; supports old clients
      const locationId = req.body?.location_id || null;

      const db =
        database === "alfarero-dev"
          ? getFirestore(undefined, "alfarero-dev")
          : getFirestore();

      const patientsCollection = db.collection("patients");

      // Build timestamps safely from { seconds }
      const startTs = Timestamp.fromMillis(dateRange[0].seconds * 1000);
      const endTs = Timestamp.fromMillis(dateRange[1].seconds * 1000);

      let q = patientsCollection
        .where("start_time", ">=", startTs)
        .where("start_time", "<=", endTs);

      if (locationId) {
        q = q.where("location_id", "==", locationId);
      }

      if (include_completed === "active") {
        q = q.where("complete", "==", false);
      } else if (include_completed === "complete") {
        q = q.where("complete", "==", true);
      }

      const snapshot = await q.get();

      const patientsData = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          pt_no: d.pt_no,
          patient_name: d.patient_name,
          start_time: d.start_time?.toDate?.() || null,
          stop_time: d.stop_time?.toDate?.() || null,
          age_group: d.age_group,
          gender: d.gender,
          reason_for_visit: d.reason_for_visit,
          plan_of_care: d.plan_of_care,
          complete: d.complete,
          tel: d.tel,
          type_of_visit: d.type_of_visit,
          waiting_time: d.waiting_time,
          location_id: d.location_id || null,
          location_name: d.location_name || null,
        };
      });

      return res.status(200).json({ patientsData });
    } catch (error) {
      console.error("Error fetching patients data:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
