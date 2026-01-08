export function getBarColors(statsData) {
  const unique = [...new Set(statsData.map((e) => e.station_type))];
  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#FFC0CB",
    "#22CC55",
    "#2255CC",
  ];

  const map = {};
  unique.forEach((st, i) => {
    map[st] = colors[i % colors.length];
  });

  return map;
}
