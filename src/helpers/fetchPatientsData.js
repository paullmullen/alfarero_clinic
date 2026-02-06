import { getDoc, doc } from "firebase/firestore";
import { firestore } from "../helpers/firebaseConfig";

const fetchPatientsData = async (
  dateRange,
  database,
  include_completed,
  locationId = null,
) => {
  if (!dateRange || dateRange.length !== 2) {
    const docRef = doc(firestore, "run_aggregation", "timestamp");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      dateRange = [data.range_start, data.range_end];
    } else {
      console.log("No date range in stats collection.!");
    }
  }

  try {
    const response = await fetch(
      "https://us-central1-alfarero-478ad.cloudfunctions.net/fetchPatientsData",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRange,
          database,
          include_completed,
          ...(locationId && locationId !== "__ALL__"
            ? { location_id: locationId }
            : {}),
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data.patientsData;
  } catch (error) {
    console.error("Error fetching patients:", error);
    return [];
  }
};

export { fetchPatientsData };
