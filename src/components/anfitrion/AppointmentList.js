import React, { useEffect, useMemo, useState } from "react";
import { Button, Empty, Segmented } from "antd";
import { useTranslation } from "react-i18next";
import moment from "moment";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "../../helpers/firebaseConfig";
import { stations } from "../../helpers/stations";
import { useAlert } from "../../hooks/alert";
import { useServiceLocation } from "../../providers/ServiceLocationProvider";

const sectionCardStyle = {
  marginTop: 16,
  background: "#ffffff",
  border: "1px solid #e8e8e8",
  borderRadius: 12,
  padding: 16,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 12,
};

const headerCellStyle = {
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "#595959",
  padding: "10px 8px",
  borderBottom: "1px solid #f0f0f0",
  whiteSpace: "nowrap",
};

const bodyCellStyle = {
  fontSize: 13,
  color: "#262626",
  padding: "10px 8px",
  borderBottom: "1px solid #f5f5f5",
  verticalAlign: "top",
};

const secondaryLineStyle = {
  color: "#8c8c8c",
  fontSize: 12,
  marginTop: 2,
};

const actionsCellStyle = {
  ...bodyCellStyle,
  whiteSpace: "nowrap",
};

const statusList = [
  "waiting",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "7",
  "7",
  "7",
  "7",
  "7",
  "7",
  "7",
  "7",
  "7",
  "7",
];

const stationOrder = [
  "reg",
  "nur",
  "doc",
  "ped",
  "og",
  "lab",
  "pha",
  "pt",
  "den",
  "nut",
  "psi",
  "ora",
];

const normalizePhone = (raw) => {
  const digits = (raw ?? "").toString().replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 8) return `502${digits}`;
  if (digits.length === 11 && digits.startsWith("502")) return digits;
  return digits;
};

const normalizeNationalId = (raw) => {
  const digits = (raw ?? "").toString().replace(/\D/g, "");
  return digits || null;
};

const normalizeVisitType = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const normalizeLocationName = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const fillMissingStations = (stationsList, visits) => {
  const result = [];
  const visitsSet = new Set(visits || []);
  let order = 0;

  stationOrder.forEach((stationValue) => {
    const station = stationsList.find((s) => s.value === stationValue);
    if (!station) return;

    if (visitsSet.has(stationValue)) {
      const nextStatus = statusList[order] || "pending";
      result.push({
        order,
        station: station.value,
        status: nextStatus,
        ...(nextStatus === "waiting" && { waiting_start: Timestamp.now() }),
      });
    } else {
      result.push({
        order,
        station: station.value,
        status: "pending",
      });
    }

    order += 1;
  });

  return result;
};

export default function AppointmentList({
  appointmentsData = [],
  appointmentScope,
  setAppointmentScope,
  onAdmit,
  onCancel,
  busyAppointmentId,
}) {
  const [t] = useTranslation("global");
  const { showAlert } = useAlert();
  const { locations = [] } = useServiceLocation();

  const [recipes, setRecipes] = useState([]);
  const [localBusyAppointmentId, setLocalBusyAppointmentId] = useState(null);

  useEffect(() => {
    const fetchVisitTypes = async () => {
      try {
        const visitTypeRef = query(
          collection(firestore, "visit_types"),
          orderBy("order"),
        );
        const visitTypeSnapshot = await getDocs(visitTypeRef);

        const nextRecipes = visitTypeSnapshot.docs.map((docu) => {
          const data = docu.data() || {};
          return {
            value: data.name,
            label: t(data.name),
            stations: Array.isArray(data.plan_of_care) ? data.plan_of_care : [],
            aliases: Array.isArray(data.aliases) ? data.aliases : [],
          };
        });

        setRecipes(nextRecipes);
      } catch (error) {
        console.error("Error loading visit type recipes:", error);
      }
    };

    fetchVisitTypes();
  }, [t]);

  const sortedAppointments = useMemo(() => {
    return [...appointmentsData].sort((a, b) => {
      const aTime = a?.appointmentDateTime || "";
      const bTime = b?.appointmentDateTime || "";
      return String(aTime).localeCompare(String(bTime));
    });
  }, [appointmentsData]);

  const resolveVisitTypeCode = (rawVisitType) => {
    const normalizedInput = normalizeVisitType(rawVisitType);
    if (!normalizedInput) return null;

    const matchedRecipe = recipes.find((recipe) => {
      const candidates = [
        recipe.value,
        ...(Array.isArray(recipe.aliases) ? recipe.aliases : []),
      ]
        .map(normalizeVisitType)
        .filter(Boolean);

      return candidates.includes(normalizedInput);
    });

    return matchedRecipe?.value || null;
  };

  const getVisitTypeDisplay = (rawVisitType) => {
    const code = resolveVisitTypeCode(rawVisitType);
    return code ? t(code) : rawVisitType;
  };

  const getPlanOfCareForVisitType = (visitTypeCode) => {
    const matchedRecipe = recipes.find(
      (recipe) => recipe.value === visitTypeCode,
    );
    if (!matchedRecipe) return [];
    return fillMissingStations(stations, matchedRecipe.stations);
  };

  const resolveLocation = (appointment) => {
    const realLocations = locations.filter((loc) => loc.id !== "__ALL__");

    const directId =
      appointment.locationId ||
      appointment.location_id ||
      appointment.serviceLocationId ||
      null;

    const directName =
      appointment.locationName ||
      appointment.location_name ||
      appointment.location ||
      null;

    if (directId) {
      const matchedById = realLocations.find((loc) => loc.id === directId);
      return {
        location_id: matchedById?.id || directId,
        location_name: matchedById?.name || directName || null,
      };
    }

    if (directName) {
      const normalizedAppointmentName = normalizeLocationName(directName);

      const matchedByName = realLocations.find(
        (loc) => normalizeLocationName(loc.name) === normalizedAppointmentName,
      );

      if (matchedByName) {
        return {
          location_id: matchedByName.id,
          location_name: matchedByName.name,
        };
      }
    }

    return {
      location_id: null,
      location_name: directName || null,
    };
  };

  const updateStatsCollection = async (station) => {
    const currentDate = moment();
    const currentMonth = currentDate.month() + 1;
    const currentYear = currentDate.year();
    const currentDay = currentDate.toDate().getDate();
    const currentMonthDayYear = `${currentMonth}/${currentDay}/${currentYear}`;
    const statsRef = doc(firestore, "stats", station);

    try {
      const statsDoc = await getDoc(statsRef);

      if (statsDoc.exists()) {
        const statsData = statsDoc.data();

        if (statsData.date !== currentMonthDayYear) {
          const statsCollectionRef = collection(firestore, "stats");
          const querySnapshot = await getDocs(statsCollectionRef);

          for (const statsDocItem of querySnapshot.docs) {
            await updateDoc(statsDocItem.ref, {
              date: currentMonthDayYear,
              number_of_patients: 0,
              procedure_time_data: [],
              waiting_time_data: [],
              avg_procedure_time: 0,
              avg_waiting_time: 0,
            });
          }
        } else if (station === statsData.station_type) {
          const currentDayPatients = statsData.number_of_patients || 0;
          await updateDoc(statsRef, {
            number_of_patients: currentDayPatients + 1,
          });
        }
      } else {
        await setDoc(statsRef, {
          station_type: station,
          number_of_patients: 1,
          date: currentMonthDayYear,
        });
      }
    } catch (error) {
      console.error("Error updating stats collection:", error);
    }
  };

  const handleAdmitInternal = async (appointment) => {
    if (!appointment?.id) return;

    if (
      appointment.admittedAt ||
      appointment.status === "admitted" ||
      appointment.admitted_patient_id
    ) {
      showAlert(
        "Error",
        t("appointment.alreadyAdmitted") ||
          "This appointment has already been admitted.",
        "error",
      );
      return;
    }

    setLocalBusyAppointmentId(appointment.id);

    try {
      const freshAppointmentRef = doc(
        firestore,
        "appointments",
        appointment.id,
      );
      const freshAppointmentSnap = await getDoc(freshAppointmentRef);

      if (!freshAppointmentSnap.exists()) {
        showAlert(
          "Error",
          t("appointment.notFound") || "Appointment no longer exists.",
          "error",
        );
        return;
      }

      const freshAppointment = {
        id: freshAppointmentSnap.id,
        ...freshAppointmentSnap.data(),
      };

      if (
        freshAppointment.admittedAt ||
        freshAppointment.status === "admitted" ||
        freshAppointment.admitted_patient_id
      ) {
        showAlert(
          "Error",
          t("appointment.alreadyAdmitted") ||
            "This appointment has already been admitted.",
          "error",
        );
        return;
      }

      const visitTypeCode = resolveVisitTypeCode(freshAppointment.visitType);
      const patientPlanOfCare = getPlanOfCareForVisitType(visitTypeCode);
      const resolvedLocation = resolveLocation(freshAppointment);

      if (!visitTypeCode) {
        showAlert(
          "Error",
          `Could not match appointment visit type "${freshAppointment.visitType}" to a visit type recipe.`,
          "error",
        );
        return;
      }

      if (!patientPlanOfCare.length) {
        showAlert(
          "Error",
          `No plan of care recipe found for "${freshAppointment.visitType}".`,
          "error",
        );
        return;
      }

      if (!resolvedLocation.location_id) {
        showAlert(
          "Error",
          t("SELECT_LOCATION_FIRST") ||
            "Could not determine the clinic for this appointment.",
          "error",
        );
        return;
      }

      const nationalId = normalizeNationalId(freshAppointment.nationalIdNumber);
      const normalizedTel = normalizePhone(freshAppointment.phone);

      const patientRef = doc(collection(firestore, "patients"));
      const ptNo = patientRef.id;

      const formattedPatient = {
        complete: false,
        createdAt: Timestamp.now(),
        last_update: Timestamp.now(),
        patient_name: freshAppointment.patientName || "",
        plan_of_care: patientPlanOfCare,
        pt_no: ptNo,
        reason_for_visit: freshAppointment.reasonForVisit || "",
        tel: normalizedTel ?? null,
        start_time: Timestamp.now(),
        stop_time: Timestamp.now(),
        waiting_time: 0,
        type_of_visit: visitTypeCode,
        gender: freshAppointment.gender || null,
        age_group: freshAppointment.ageGroup || null,
        national_id_number: nationalId,
        new_patient: false,
        location_id: resolvedLocation.location_id,
        location_name: resolvedLocation.location_name,
        appointment_id: freshAppointment.id,
        appointment_time: freshAppointment.appointmentAt || null,
        admitted_from_appointment: true,
      };

      await setDoc(patientRef, formattedPatient);

      const firstActiveStation = patientPlanOfCare.find(
        (station) => station.status === "waiting",
      );

      if (firstActiveStation) {
        await updateStatsCollection(firstActiveStation.station);
      }

      if (nationalId) {
        const kpRef = doc(firestore, "known_patients", nationalId);
        const kpSnap = await getDoc(kpRef);

        if (!kpSnap.exists()) {
          await setDoc(kpRef, {
            national_id_number: nationalId,
            patient_name: freshAppointment.patientName || null,
            gender: freshAppointment.gender ?? null,
            age_group: freshAppointment.ageGroup ?? null,
            is_new: false,
            created_at: Timestamp.now(),
            tel: normalizedTel ?? null,
            last_seen_at: Timestamp.now(),
            last_patient_doc_id: ptNo,
          });
        } else {
          const existing = kpSnap.data() || {};
          await updateDoc(kpRef, {
            patient_name:
              freshAppointment.patientName || existing.patient_name || null,
            gender: freshAppointment.gender ?? existing.gender ?? null,
            age_group: freshAppointment.ageGroup ?? existing.age_group ?? null,
            tel: normalizedTel ?? existing.tel ?? null,
            last_seen_at: Timestamp.now(),
            last_patient_doc_id: ptNo,
          });
        }
      }

      await updateDoc(freshAppointmentRef, {
        admittedAt: Timestamp.now(),
        admitted_patient_id: ptNo,
        status: "admitted",
        updatedAt: Timestamp.now(),
      });

      await onAdmit?.(freshAppointment, ptNo);

      showAlert(
        "Success",
        t("appointment.admittedSuccess") || "Patient admitted successfully.",
        "success",
      );
    } catch (error) {
      console.error("Error admitting appointment:", error);
      showAlert(
        "Error",
        t("somethingWentWrong") || "Something went wrong.",
        "error",
      );
    } finally {
      setLocalBusyAppointmentId(null);
    }
  };

  return (
    <div style={sectionCardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {t("appointment.title")}
          </div>
          <div style={{ fontSize: 13, color: "#8c8c8c", marginTop: 2 }}>
            {t("appointment.subtitle")}
          </div>
        </div>

        <Segmented
          value={appointmentScope}
          onChange={setAppointmentScope}
          options={[
            { label: t("appointment.todayOnly"), value: "today" },
            { label: t("appointment.todayAndFuture"), value: "future" },
          ]}
        />
      </div>

      {sortedAppointments.length === 0 ? (
        <div style={{ marginTop: 18 }}>
          <Empty description={t("appointment.noneFound")} />
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headerCellStyle}>{t("appointment.time")}</th>
                <th style={headerCellStyle}>{t("appointment.patient")}</th>
                <th style={headerCellStyle}>{t("appointment.details")}</th>
                <th style={headerCellStyle}>{t("appointment.actions")}</th>
              </tr>
            </thead>

            <tbody>
              {sortedAppointments.map((appointment, index) => {
                const isBusy =
                  busyAppointmentId === appointment.id ||
                  localBusyAppointmentId === appointment.id;

                return (
                  <tr
                    key={appointment.id}
                    style={{
                      background: index % 2 === 0 ? "#ffffff" : "#fafafa",
                    }}
                  >
                    <td style={bodyCellStyle}>
                      <div>{appointment.appointmentDateTime || "—"}</div>
                      {!!appointment.location && (
                        <div style={secondaryLineStyle}>
                          {appointment.location}
                        </div>
                      )}
                    </td>

                    <td style={bodyCellStyle}>
                      <div style={{ fontWeight: 600 }}>
                        {appointment.patientName || "—"}
                      </div>

                      {!!appointment.nationalIdNumber && (
                        <div style={secondaryLineStyle}>
                          {t("appointment.dpi")}: {appointment.nationalIdNumber}
                        </div>
                      )}

                      {!!appointment.phone && (
                        <div style={secondaryLineStyle}>
                          {t("appointment.phone")}: {appointment.phone}
                        </div>
                      )}
                    </td>

                    <td style={bodyCellStyle}>
                      {!!appointment.reasonForVisit && (
                        <div>{appointment.reasonForVisit}</div>
                      )}

                      <div style={secondaryLineStyle}>
                        {[
                          getVisitTypeDisplay(appointment.visitType),
                          appointment.ageGroup
                            ? t(appointment.ageGroup)
                            : appointment.ageGroup,
                          appointment.gender === "masculine"
                            ? t("male")
                            : appointment.gender === "feminine"
                              ? t("female")
                              : appointment.gender,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "—"}
                      </div>
                    </td>

                    <td style={actionsCellStyle}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <Button
                          size="small"
                          danger
                          onClick={() => onCancel?.(appointment)}
                          loading={isBusy}
                        >
                          {t("appointment.cancel")}
                        </Button>

                        <Button
                          size="small"
                          type="primary"
                          onClick={() => handleAdmitInternal(appointment)}
                          loading={isBusy}
                        >
                          {t("appointment.admit")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
