//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

import * as functions from "firebase-functions";
import admin from "firebase-admin";
import corsFactory from "cors";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const cors = corsFactory({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}

export const fetchDaysAgoData = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const { daysCount, database } = req.body;
      console.log("Received daysCount:", daysCount);

      const db =
        database === "alfarero-dev"
          ? getFirestore(app, "alfarero-dev")
          : getFirestore(app);

      console.log("Using Firestore database:", db._databaseId.database);

      if (typeof daysCount !== "number" || isNaN(daysCount) || daysCount < 0) {
        return res.status(400).json({ error: "Invalid daysCount parameter" });
      }

      const now = new Date();
      const daysAgo = new Date(now.setDate(now.getDate() - daysCount));
      const daysAgoTimestamp = Timestamp.fromDate(daysAgo);

      const patientsCollection = db.collection("patients");
      const querySnapshot = await patientsCollection
        .where("start_time", ">=", daysAgoTimestamp)
        .get();

      const patientCountHistogram = querySnapshot.docs.reduce(
        (histogram, doc) => {
          const startTime = doc.data().start_time.toDate();
          const day = startTime.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
          });

          const existingEntry = histogram.find((entry) => entry.date === day);
          if (existingEntry) {
            existingEntry.count++;
          } else {
            histogram.push({ date: day, count: 1 });
          }
          return histogram;
        },
        [],
      );

      return res.status(200).json(patientCountHistogram);
    } catch (error) {
      console.error("Error fetching data:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
