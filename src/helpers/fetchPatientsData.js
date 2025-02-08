const fetchPatientsData = async (dateRange, database) => {
  try {
    const response = await fetch(
      "https://us-central1-alfarero-478ad.cloudfunctions.net/fetchPatientsData",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dateRange, database: database }),
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
