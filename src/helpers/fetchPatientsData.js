const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.fetchPatientsData = onRequest(
  {
    cors: [/localhost(:\d+)?$/, "http://multimedica.org"],
    methods: ["GET", "POST", "OPTIONS"], // Allowed methods
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { dateRange } = req.body;

      // Firestore query logic
      const db = admin.firestore();
      const patientsCollection = db.collection("patients");
      const snapshot = await patientsCollection.get();

      const patientsData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const start_time = data.start_time.toMillis();
        if (start_time >= dateRange[0] && start_time <= dateRange[1]) {
          patientsData.push({
            pt_no: data.pt_no,
            patient_name: data.patient_name,
            start_time: data.start_time.toDate(),
            reason_for_visit: data.reason_for_visit,
          });
        }
      });

      return res.status(200).json({ patientsData });
    } catch (error) {
      console.error("Error fetching patients data:", error);
      return res.status(500).send("Internal Server Error");
    }
  }
);
