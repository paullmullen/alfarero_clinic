const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

exports.getPatientsData = onRequest(
  {
    region: "us-central1",
    cors: [
      /localhost(:\d+)?$/,
      "https://multimedica.org",
      "https://alfarero-478ad--expire-iqz1ydnq.web.app",
    ],
    methods: ["POST", "OPTIONS"],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") return res.status(204).send("");

    if (req.method !== "POST")
      return res.status(405).send("Method Not Allowed");

    try {
      const { dateRange, database, include_completed } = req.body;

      // ✅ default DB (since app already initialized in index.js)
      const db = admin.firestore();

      // ... keep the rest of your query code ...
    } catch (error) {
      console.error("Error fetching patients data:", error);
      return res.status(500).send("Internal Server Error");
    }
  },
);
