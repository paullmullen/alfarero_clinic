"use strict";

module.exports = function selectKeyObservations(observations, typesById = {}) {
  const safe = Array.isArray(observations) ? observations : [];

  const normalized = safe
    .map((o) => {
      const typeId = String(o?.typeId ?? "").trim();
      const type = typesById?.[typeId] ?? null;

      const dateMs =
        typeof o?.date?.toMillis === "function"
          ? o.date.toMillis()
          : o?.date instanceof Date
            ? o.date.getTime()
            : typeof o?.date === "number"
              ? o.date
              : 0;

      return { ...o, typeId, type, dateMs };
    })
    .filter((o) => o.ymd);

  normalized.sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0));

  const top3 = normalized.slice(0, 3);
  const remaining = Math.max(0, normalized.length - top3.length);

  return { top3, remaining };
};
