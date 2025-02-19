const fetchDaysAgoData = async (daysCount) => {
  console.log("Sending request with daysCount:", daysCount, typeof daysCount);
  const numericDaysCount =
    typeof daysCount === "number" ? daysCount : Number(daysCount);
  console.log(typeof numericDaysCount);
  try {
    const response = await fetch(
      "https://us-central1-alfarero-478ad.cloudfunctions.net/fetchDaysAgoData",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ daysCount: numericDaysCount }),
      }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    console.log("Response:", data);
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
};

export { fetchDaysAgoData };
