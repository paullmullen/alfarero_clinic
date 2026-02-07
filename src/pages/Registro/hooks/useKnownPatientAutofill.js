// src/pages/Registro/hooks/useKnownPatientAutofill.js
import { useRef, useState } from "react";
import { getKnownPatientById } from "../services/knownPatientsService";

/**
 * Debounced DPI (13 digits) lookup that can auto-fill the form.
 */
export function useKnownPatientAutofill({ firestore, form }) {
  const [kpLookup, setKpLookup] = useState({ status: "idle", lastId: null });
  const debounceRef = useRef(null);

  const fetchKnownPatient = async (rawId) => {
    setKpLookup({ status: "loading", lastId: rawId });

    try {
      const kp = await getKnownPatientById(firestore, rawId);
      if (kp) {
        form.setFieldsValue({
          paciente: kp.patient_name ?? form.getFieldValue("paciente"),
          gender: kp.gender ?? form.getFieldValue("gender"),
          age_group: kp.age_group ?? form.getFieldValue("age_group"),
          tel: kp.telephone_number ?? kp.tel ?? form.getFieldValue("tel"),
        });
        setKpLookup({ status: "found", lastId: rawId });
      } else {
        setKpLookup({ status: "not_found", lastId: rawId });
      }
    } catch (err) {
      console.error("known_patients lookup error:", err);
      setKpLookup({ status: "error", lastId: rawId });
    }
  };

  const maybeAutofillFromDpi = (rawId) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (rawId && rawId.length === 13) {
      debounceRef.current = setTimeout(() => fetchKnownPatient(rawId), 300);
    } else {
      setKpLookup({ status: "idle", lastId: null });
    }
  };

  const resetLookup = () => setKpLookup({ status: "idle", lastId: null });

  return { kpLookup, maybeAutofillFromDpi, resetLookup };
}
