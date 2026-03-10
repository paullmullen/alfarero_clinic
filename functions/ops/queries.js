import { getFirestore } from "firebase-admin/firestore";

// Example structure — adjust based on your actual code
export async function fetchObservationTypes({ db }) {
  const snapshot = await db.collection("observation_types").get();
  const typesById = {};
  snapshot.forEach((doc) => {
    typesById[doc.id] = doc.data();
  });
  return typesById;
}

export async function fetchOpsObservationsByYmdRange({
  db,
  startYMD,
  endYMD,
  limitN,
}) {
  const snapshot = await db
    .collection("ops_observations")
    .where("ymd", ">=", startYMD)
    .where("ymd", "<=", endYMD)
    .limit(limitN)
    .get();

  const results = [];
  snapshot.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
  return results;
}
