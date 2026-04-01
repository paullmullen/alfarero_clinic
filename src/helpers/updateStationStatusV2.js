import { auth } from "../helpers/firebaseConfig";

const API_BASE =
  process.env.REACT_APP_FUNCTIONS_BASE_URL ||
  "https://us-central1-alfarero-478ad.cloudfunctions.net";

const UPDATE_STATUS_V2_URL = `${API_BASE}/updateStatusChangeV2`;

export const handleStatusChangeV2 = async (
  newStatus,
  patientId,
  stationCode,
) => {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const response = await fetch(UPDATE_STATUS_V2_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        patientId,
        carePlanIndex: stationCode,
        newStatus,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("updateStatusChangeV2 failed", {
        status: response.status,
        data,
      });
      throw new Error(data?.error || "Failed to update patient status.");
    }

    return data;
  } catch (error) {
    console.error("Error in handleStatusChangeV2:", error);
    throw error;
  }
};
