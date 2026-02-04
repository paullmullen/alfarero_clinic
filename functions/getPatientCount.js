//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

exports.getPatientCount = onRequest(
  {
    region: "us-central1",
    cors: [
      /localhost(:\d+)?$/,
      "https://multimedica.org",
      "https://alfarero-478ad--testing-nc9ftcse.web.app",
    ],
    methods: ["POST", "OPTIONS"],
  },
  async (req, res) => {
    try {
      // ✅ allow CORS preflight
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      // enforce POST-only
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const { database, startTimestamp, endTimestamp } = req.body;
      console.log(
        "Received Request Data:",
        database,
        startTimestamp,
        endTimestamp,
      );

      // use already-initialized default app
      const db = admin.firestore();

      const snapshot = await db
        .collection("patients")
        .where(
          "start_time",
          ">=",
          new admin.firestore.Timestamp(startTimestamp.seconds, 0),
        )
        .where(
          "start_time",
          "<=",
          new admin.firestore.Timestamp(endTimestamp.seconds, 0),
        )
        .get();

      return res.status(200).json({ records: snapshot.size });
    } catch (error) {
      console.error("Error fetching patients data:", error);
      return res.status(500).send("Internal Server Error");
    }
  },
);
