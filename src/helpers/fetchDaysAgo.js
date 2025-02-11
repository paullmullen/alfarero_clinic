import axios from "axios";

const fetchDaysAgoData = async (daysCount) => {
  try {
    const response = await axios.post(
      "https://us-central1-alfarero-478ad.cloudfunctions.net/fetchDaysAgoData",
      { daysCount }, // ✅ Sending daysCount as a JSON payload
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
};

export { fetchDaysAgoData };
