const fetchPatientsData = async (dateRange) => {
  try {
    const response = await fetch(
      "https://<YOUR_REGION>-<YOUR_PROJECT_ID>.cloudfunctions.net/fetchPatientsData",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dateRange }),
      }
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
