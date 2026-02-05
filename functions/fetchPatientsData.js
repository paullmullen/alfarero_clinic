//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize the default Firestore instance
const app = admin.initializeApp();

exports.fetchPatientsData = onRequest(
  {
    cors: [
      /localhost(:\d+)?$/,
      "https://multimedica.org",
      "https://alfarero-478ad--testing-nc9ftcse.web.app",
    ],
    methods: ["GET", "POST", "OPTIONS"],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { dateRange, database, include_completed } = req.body;

      // ✅ optional; supports old clients
      const locationId = req.body?.location_id || null;

      console.log("Received Request Data:", {
        dateRange,
        database,
        include_completed,
        locationId,
      });

      const db =
        database === "alfarero-dev"
          ? getFirestore(app, "alfarero-dev")
          : getFirestore(app);

      console.log("Using Firestore database:", db._databaseId.database);

      const patientsCollection = db.collection("patients");

      // Build timestamps safely from your JSON {seconds, ...}
      const startTs = new admin.firestore.Timestamp(dateRange[0].seconds, 0);
      const endTs = new admin.firestore.Timestamp(dateRange[1].seconds, 0);

      let q = patientsCollection
        .where("start_time", ">=", startTs)
        .where("start_time", "<=", endTs);

      // ✅ add location filter ONLY when provided
      if (locationId) {
        q = q.where("location_id", "==", locationId);
      }

      // complete filter branches
      if (include_completed === "both") {
        // no extra complete filter
      } else if (include_completed === "active") {
        q = q.where("complete", "==", false);
      } else {
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

          // optional (handy for debugging / later use)
          location_id: d.location_id || null,
          location_name: d.location_name || null,
        };
      });

      return res.status(200).json({ patientsData });
    } catch (error) {
      console.error("Error fetching patients data:", error);
      return res.status(500).send("Internal Server Error");
    }
  },
);
