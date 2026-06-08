// src/pages/Registro/services/patientsService.js
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

export async function createPatientDoc({ firestore, formattedPatient }) {
  const patientRef = await addDoc(
    collection(firestore, "patients"),
    formattedPatient,
  );
  const ptNo = patientRef.id;

  const updatedPatient = { ...formattedPatient, pt_no: ptNo };
  await updateDoc(doc(firestore, "patients", ptNo), updatedPatient);

  return { ptNo, updatedPatient };
}

export function buildFormattedPatient({
  patient,
  patientPlanOfCare,
  normalizedTel,
  nationalId,
  isNewPatient,
  effectiveLocationId,
  effectiveLocationName,
}) {
  return {
    complete: false,
    last_update: Timestamp.now(),
    patient_name: patient.paciente,
    plan_of_care: patientPlanOfCare,
    pt_no: "",
    reason_for_visit: patient.motivo,
    tel: normalizedTel ?? null,
    start_time: Timestamp.now(),
    stop_time: Timestamp.now(),
    waiting_time: 0,
    type_of_visit: patient.tipo,
    gender: patient.gender,
    age_group: patient.age_group !== undefined ? patient.age_group : null,
    national_id_number: nationalId,
    new_patient: isNewPatient,

    // NEW
    organization_id: patient.organization_id ?? null,
    organization_name: patient.organization_name ?? null,

    guardian_name: patient.guardian_name ?? null,

    location_id: effectiveLocationId,
    location_name: effectiveLocationName || null,
  };
}
