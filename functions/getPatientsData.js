import { onRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const getPatientsData = onRequest(
  {
    region: "us-central1",
    cors: [
      /localhost(:\d+)?$/,
      "https://multimedica.org",
      "https://alfarero-478ad--expire-o4gpaz9l.web.app",
    ],
    methods: ["POST", "OPTIONS"],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") return res.status(204).send("");

    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { dateRange, database, include_completed } = req.body;

      // default DB (app already initialized in index.js)
      const db = admin.firestore();

      // ... keep the rest of your query code ...
    } catch (error) {
      console.error("Error fetching patients data:", error);
      return res.status(500).send("Internal Server Error");
    }
  },
);
