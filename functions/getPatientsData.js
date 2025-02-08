const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const Timestamp = admin.firestore.Timestamp;

// Initialize the default Firestore instance
app = admin.initializeApp();

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
      const { dateRange, database } = req.body; // Destructure in a single line

      const db =
        database === "alfarero-dev"
          ? getFirestore(app, "alfarero-dev") // Explicitly select 'alfarero-dev' database
          : getFirestore(app);

      console.log("Using Firestore database:", db._databaseId.database);

      // Firestore query logic
      const patientsCollection = db.collection("patients");
      const snapshot = await patientsCollection
        .where(
          "start_time",
          ">=",
          new admin.firestore.Timestamp(dateRange[0].seconds, 0)
        )
        .where(
          "start_time",
          "<=",
          new admin.firestore.Timestamp(dateRange[1].seconds, 0)
        )
        .get();

      const patientsData = snapshot.docs.map((doc) => ({
        pt_no: doc.data().pt_no,
        patient_name: doc.data().patient_name,
        start_time: doc.data().start_time.toDate(),
        reason_for_visit: doc.data().reason_for_visit,
        plan_of_care: doc.data().plan_of_care,
      }));

      console.log(patientsData);

      return res.status(200).json({ patientsData });
    } catch (error) {
      console.error("Error fetching patients data:", error);
      return res.status(500).send("Internal Server Error");
    }
  }
);
