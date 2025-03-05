//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const Timestamp = admin.firestore.Timestamp;

// Initialize the default Firestore instance
app = admin.initializeApp();

exports.getPatientCount = onRequest(
  {
    cors: [
      /localhost(:\d+)?$/,
      "https://multimedica.org",
      "https://alfarero-478ad--testing-nc9ftcse.web.app",
    ],
    methods: ["GET", "POST", "OPTIONS"], // Allowed methods
  },

  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const { database, startTimestamp, endTimestamp } = req.body; // Destructure in a single line
      console.log(
        "Received Request Data:",
        database,
        startTimestamp,
        endTimestamp
      );

      const db =
        database === "alfarero-dev"
          ? getFirestore(app, "alfarero-dev") // Explicitly select 'alfarero-dev' database
          : getFirestore(app);

      console.log("Using Firestore database:", db._databaseId.database);

      // Firestore query logic
      const patientsCollection = db.collection("patients");
      let snapshot;

      snapshot = await patientsCollection
        .where(
          "start_time",
          ">=",
          new admin.firestore.Timestamp(startTimestamp.seconds, 0)
        )
        .where(
          "start_time",
          "<=",
          new admin.firestore.Timestamp(endTimestamp.seconds, 0)
        )
        .get();

      console.log(snapshot.size);

      return res.status(200).json({ records: snapshot.size });
    } catch (error) {
      console.error("Error fetching patients data:", error);
      return res.status(500).send("Internal Server Error");
    }
  }
);
