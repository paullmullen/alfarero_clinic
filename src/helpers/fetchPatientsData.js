const fetchPatientsData = async (dateRange) => {
  const url =
    "https://us-central1-alfarero-478ad.cloudfunctions.net/fetchPatientsData";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dateRange }),
    });

    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.statusText}`);
    }

    const data = await response.json();
    return data.patientsData;
  } catch (error) {
    console.error("Error fetching patient data:", error);
    throw error;
  }
};
export { fetchPatientsData };
