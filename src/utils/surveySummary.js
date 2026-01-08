export function surveySummary(surveys) {
  const histogram = [0, 0, 0, 0, 0];

  for (let i = 0; i < surveys.length; i++) {
    const s = surveys[i].satisfaction;
    histogram[s] = (histogram[s] ?? 0) + 1;
  }

  return [
    { level: "1", count: histogram[1] },
    { level: "2", count: histogram[2] },
    { level: "3", count: histogram[3] },
    { level: "4", count: histogram[4] },
    { level: "5", count: histogram[5] },
  ];
}
