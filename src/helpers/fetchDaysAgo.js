const fetchDaysAgoData = async (database, daysCount) => {
  const numericDaysCount =
    typeof daysCount === "number" ? daysCount : Number(daysCount);
  try {
    const response = await fetch(
      "https://us-central1-alfarero-478ad.cloudfunctions.net/fetchDaysAgoData",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          daysCount: numericDaysCount,
          database: database,
        }),
      }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
};

export { fetchDaysAgoData };
