//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const app = admin.initializeApp(); // Ensure this is properly declared

exports.updateStatusChange = onRequest(
  {
    cors: [
      /localhost(:\d+)?$/,
      "https://multimedica.org",
      "https://alfarero-478ad--testing-nc9ftcse.web.app",
    ],
    methods: ["GET", "POST", "OPTIONS"], // Allowed methods
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { patientId, carePlanIndex, newStatus, databaseName } = req.body;

      console.log(
        "Received Request Data:",
        patientId,
        carePlanIndex,
        newStatus,
        databaseName
      );

      if (!patientId || !carePlanIndex || !newStatus) {
        console.error("Invalid arguments:", {
          patientId,
          carePlanIndex,
          newStatus,
          databaseName,
        });
        return res
          .status(400)
          .json({ error: "Invalid arguments. Missing required data." });
      }

      const db =
        databaseName === "alfarero-dev"
          ? getFirestore(app, "alfarero-dev") // Explicitly select the correct database
          : getFirestore(app);

      console.log("Using Firestore database:", db._databaseId.database);

      // Validate required data
      if (!patientId || !carePlanIndex || !newStatus) {
        console.error("Invalid arguments:", {
          patientId,
          carePlanIndex,
          newStatus,
        });
        return res.status(400).json({
          error: "Invalid arguments. Missing required data.",
        });
      }

      console.log(`Using database: ${databaseName}`);

      // Reference and fetch the patient document
      const patientRef = db.collection("patients").doc(patientId);
      const patientDoc = await patientRef.get();

      if (!patientDoc.exists) {
        console.error("Patient not found:", patientId);
        return res.status(404).json({ error: "Patient not found", patientId });
      }

      const patientData = patientDoc.data();
      if (!patientData) {
        console.error("Patient data is undefined.");
        return res.status(404).json({ error: "Patient data is undefined." });
      }

      console.log("Patient Data:", patientData);

      // Ensure `plan_of_care` is an array
      if (
        !Array.isArray(patientData.plan_of_care) ||
        patientData.plan_of_care.length === 0
      ) {
        console.error("plan_of_care is not a valid array or is empty.");
        return res.status(400).json({
          error: "plan_of_care is not a valid array or is empty.",
        });
      }

      // Find the specific entry in `plan_of_care` where `station` matches `carePlanIndex`
      const carePlanEntryIndex = patientData.plan_of_care.findIndex(
        (entry) => entry.station === carePlanIndex
      );

      if (carePlanEntryIndex === -1) {
        console.error(
          "No matching station found in plan_of_care for station:",
          carePlanIndex
        );
        return res.status(400).json({
          error: `No matching station found in plan_of_care for station: ${carePlanIndex}`,
        });
      }

      // Retrieve the entry and make updates
      const currentEntry = patientData.plan_of_care[carePlanEntryIndex];
      const now = admin.firestore.Timestamp.now();

      // Initialize an updated entry with existing values
      const updatedEntry = {
        ...currentEntry,
        status: newStatus,
        lastUpdate: now,
      };

      // Update waiting and process times based on the status change
      if (newStatus === "waiting" && currentEntry.status !== "waiting") {
        updatedEntry.waiting_start = now;
        updatedEntry.waiting_end = null;
        updatedEntry.waiting_time = null;
      } else if (currentEntry.status === "waiting" && newStatus !== "waiting") {
        updatedEntry.waiting_end = now;
        if (updatedEntry.waiting_start && updatedEntry.waiting_end) {
          const start = updatedEntry.waiting_start;
          const end = updatedEntry.waiting_end;
          updatedEntry.waiting_time = end - start; // Time in seconds
        }
      }

      if (newStatus === "in_process" && currentEntry.status !== "in_process") {
        updatedEntry.in_process_start = now;
        updatedEntry.in_process_end = null;
        updatedEntry.procedure_time = null;
      } else if (
        currentEntry.status === "in_process" &&
        newStatus !== "in_process"
      ) {
        updatedEntry.in_process_end = now;
        if (updatedEntry.in_process_start && updatedEntry.in_process_end) {
          const start = updatedEntry.in_process_start;
          const end = updatedEntry.in_process_end;
          updatedEntry.procedure_time = end - start; // Time in seconds
        }
      }

      // Replace the entry in the `plan_of_care` array
      let updatedPlanOfCare = [...patientData.plan_of_care];
      updatedPlanOfCare[carePlanEntryIndex] = updatedEntry;

      // if the change is from anything to "complete", update the next eligible station to "waiting"
      if (newStatus === "complete") {
        let updated = false; // Track if we've already updated an eligible station
        let updatedIndex = -1; // Track the index of the updated station

        const tempPlanOfCare = updatedPlanOfCare.map((station, index) => {
          if (
            !updated &&
            ["2", "3", "4", "5", "6", "7"].includes(station.status)
          ) {
            updated = true; // Mark the first eligible station for update
            updatedIndex = index; // Save the index of the updated station
            return {
              ...station,
              status: "waiting",
              waiting_start: now,
              lastUpdate: now,
            };
          }
          return station;
        });

        // Update the plan of care with the modified station
        if (updatedIndex !== -1) {
          updatedPlanOfCare[updatedIndex] = tempPlanOfCare[updatedIndex];
        }
      }

      // Commit the updated array back to Firestore
      await patientRef.update({ plan_of_care: updatedPlanOfCare });

      console.log(
        "Successfully updated plan_of_care for station:",
        carePlanIndex
      );
      return res.status(200).json({ success: true, updatedPlanOfCare });
    } catch (error) {
      console.error("Error updating plan_of_care:", error);
      return res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  }
);
