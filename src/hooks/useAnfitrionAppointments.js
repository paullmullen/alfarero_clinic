import { useEffect, useMemo, useCallback, useState } from "react";
import {
  collection,
  query,
  where,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { firestore } from "../helpers/firebaseConfig";

export default function useAnfitrionAppointments({
  todayTimestamp,
  tomorrowTimestamp,
  appointmentScope,
  locationFilterName,
}) {
  const [appointmentsRaw, setAppointmentsRaw] = useState([]);

  useEffect(() => {
    const baseConstraints = [where("appointmentAt", ">=", todayTimestamp)];

    if (appointmentScope === "today") {
      baseConstraints.push(where("appointmentAt", "<", tomorrowTimestamp));
    }

    if (locationFilterName) {
      baseConstraints.push(where("location", "==", locationFilterName));
    }

    const q = query(collection(firestore, "appointments"), ...baseConstraints);

    const unsubscribeAppointments = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAppointmentsRaw(rows);
    });

    return () => unsubscribeAppointments();
  }, [todayTimestamp, tomorrowTimestamp, locationFilterName, appointmentScope]);

  const getAppointmentMs = useCallback((appointment) => {
    const candidate = appointment?.appointmentAt || null;

    if (candidate instanceof Timestamp) return candidate.toMillis();

    if (candidate?.seconds) {
      return new Timestamp(
        candidate.seconds,
        candidate.nanoseconds || 0,
      ).toMillis();
    }

    return null;
  }, []);

  const formatAppointmentDateTime = useCallback(
    (appointment) => {
      const rawDateText = appointment?.appointmentDateText || "";
      const rawTimeText = appointment?.appointmentTimeText || "";

      if (rawDateText || rawTimeText) {
        return [rawDateText, rawTimeText].filter(Boolean).join(" • ");
      }

      const ms = getAppointmentMs(appointment);
      if (!ms) return "";

      return new Date(ms).toLocaleString();
    },
    [getAppointmentMs],
  );

  const appointmentsData = useMemo(() => {
    return (appointmentsRaw || [])
      .filter((item) => {
        if (!item) return false;

        const admitted =
          item.admitted === true ||
          item.status === "admitted" ||
          item.convertedToPatient === true;

        const cancelled =
          item.cancelled === true || item.status === "cancelled";

        if (admitted || cancelled) return false;

        const appointmentMs = getAppointmentMs(item);
        if (appointmentMs === null) return false;

        return true;
      })
      .sort((a, b) => {
        const aMs = getAppointmentMs(a) ?? Number.MAX_SAFE_INTEGER;
        const bMs = getAppointmentMs(b) ?? Number.MAX_SAFE_INTEGER;
        return aMs - bMs;
      })
      .map((item) => ({
        id: item.id,
        patientName: item.patientName || "—",
        nationalIdNumber: item.dpi || "",
        phone: item.phoneNumber || "",
        visitType: item.visitType || "",
        reasonForVisit: item.reasonForVisit || "",
        appointmentDateTime: formatAppointmentDateTime(item),
        location: item.location || "",
        ageGroup: item.ageGroup || "",
        gender: item.gender || "",
        raw: item,
      }));
  }, [appointmentsRaw, getAppointmentMs, formatAppointmentDateTime]);

  return {
    appointmentsRaw,
    appointmentsData,
  };
}
