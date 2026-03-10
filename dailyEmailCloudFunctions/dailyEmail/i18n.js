import es from "../i18n/es.json" assert { type: "json" };

function getNested(obj, path) {
  return String(path)
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined),
      obj,
    );
}

export function t(key, fallback) {
  const val = getNested(es, key);
  return typeof val === "string" ? val : (fallback ?? key);
}
