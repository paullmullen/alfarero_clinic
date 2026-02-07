// src/pages/Registro/services/knownPatientsService.js
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";

export async function getKnownPatientById(firestore, rawId) {
  const kpRef = doc(firestore, "known_patients", rawId);
  const kpSnap = await getDoc(kpRef);
  if (!kpSnap.exists()) return null;
  return { id: rawId, ...kpSnap.data() };
}

export async function upsertKnownPatient({
  firestore,
  nationalId,
  patientName,
  gender,
  ageGroup,
  tel,
  ptNo,
}) {
  const kpRef = doc(firestore, "known_patients", nationalId);
  const kpSnap = await getDoc(kpRef);

  if (!kpSnap.exists()) {
    await setDoc(kpRef, {
      national_id_number: nationalId,
      patient_name: patientName || null,
      gender: gender ?? null,
      age_group: ageGroup ?? null,
      is_new: true,
      created_at: Timestamp.now(),
      tel: tel ?? null,
      last_seen_at: Timestamp.now(),
      last_patient_doc_id: ptNo,
    });
    return;
  }

  const existing = kpSnap.data() || {};
  await updateDoc(kpRef, {
    patient_name: patientName || existing.patient_name || null,
    gender: gender ?? existing.gender ?? null,
    age_group: ageGroup ?? existing.age_group ?? null,
    last_seen_at: Timestamp.now(),
    last_patient_doc_id: ptNo,
  });
}
