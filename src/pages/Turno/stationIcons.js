// --- Station icon loader: expects icons named <station>.png (e.g. doc.png) ---
// Put these PNGs in ../img/stations/ (or change the path below).
const stationIconsContext = require.context(
  "../../img/stations",
  false,
  /\.png$/,
);

const stationIconMap = stationIconsContext.keys().reduce((acc, key) => {
  const file = key.replace("./", "");
  const stationName = file.replace(".png", "");
  acc[stationName] = stationIconsContext(key);
  return acc;
}, {});

export function getStationIconSrc(station) {
  return stationIconMap[String(station || "").toLowerCase()] || null;
}
