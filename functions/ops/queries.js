"use strict";

async function fetchObservationTypes({ db }) {
  const snap = await db.collection("ops_observation_types").get();
  const typesById = {};

  snap.forEach((doc) => {
    const d = doc.data() || {};
    typesById[doc.id] = {
      id: doc.id,
      active: d.active ?? true,
      category: d.category ?? "",
      impact: d.impact ?? "negative",
      labelKey: d.labelKey ?? `ops.types.${doc.id}`,
      sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 9999,
    };
  });

  return typesById;
}

async function fetchOpsObservationsByYmdRange({
  db,
  startYMD,
  endYMD,
  limitN = 1500,
}) {
  const snap = await db
    .collection("ops_observations")
    .where("ymd", ">=", startYMD)
    .where("ymd", "<=", endYMD)
    .orderBy("ymd", "desc")
    .limit(limitN)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
}

module.exports = {
  fetchObservationTypes,
  fetchOpsObservationsByYmdRange,
};
