export async function checkForWaitingPatient({
  db,
  station_id,
  location_id,
  current_visit_id,
}) {
  const snapshot = await db
    .collection("patients")
    .where("location_id", "==", location_id)
    .where("complete", "==", false)
    .get();

  for (const doc of snapshot.docs) {
    // Skip the patient who just scanned out
    if (doc.id === String(current_visit_id)) continue;

    const data = doc.data();
    const poc = data.plan_of_care || [];

    const isWaitingHere = poc.some(
      (step) => step.station === station_id && step.status === "waiting",
    );

    if (isWaitingHere) {
      return true;
    }
  }

  return false;
}
