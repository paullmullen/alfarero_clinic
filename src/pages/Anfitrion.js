// src/pages/Anfitrion.js
import React, {
  useEffect,
  useState,
  useMemo,
  lazy,
  Suspense,
  useCallback,
  memo,
} from "react";
import { Table, Space, Popover, Popconfirm, Button, Segmented } from "antd";
import {
  collection,
  query,
  where,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { fetchData } from "../helpers/fetchData";
import { firestore } from "./../helpers/firebaseConfig";
import {
  handleStatusChange,
  handleDelete,
} from "./../helpers/updateStationStatus";
import { useNavigate } from "react-router-dom";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import { useTranslation } from "react-i18next";
import IconSizes from "../helpers/iconSizes";
import two from "../img/2.svg";
import three from "../img/3.svg";
import four from "../img/4.svg";
import five from "../img/5.svg";
import six from "../img/6.svg";
import seven from "../img/7.svg";
import waiting from "../img/waiting.svg";
import in_process from "../img/in_process.svg";
import not_planned from "../img/not_planned.svg";
import complete from "../img/complete.svg";
import fin from "../img/fin.png";
import eye from "../img/eye.svg";
import edit from "../img/edit.svg";
import { getTodayAndTomorrowTimestamps } from "../helpers/dateHelpers";
import { useServiceLocation } from "../providers/ServiceLocationProvider";

const EditPatientData = lazy(() => import("../components/EditPatientData.js"));

const sectionCardStyle = {
  marginTop: 16,
  background: "#ffffff",
  border: "1px solid #e8e8e8",
  borderRadius: 12,
  padding: 16,
};

const appointmentRowStyle = {
  display: "grid",
  gridTemplateColumns: "140px minmax(220px, 1.5fr) minmax(220px, 1.2fr) 160px",
  gap: 12,
  alignItems: "center",
  padding: "10px 12px",
  borderTop: "1px solid #f0f0f0",
};

const appointmentCellLabelStyle = {
  fontSize: 12,
  color: "#8c8c8c",
  marginBottom: 2,
};

const appointmentCellValueStyle = {
  fontSize: 14,
  color: "#262626",
  lineHeight: 1.35,
};

const mobileAppointmentBlockStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "12px 0",
  borderTop: "1px solid #f0f0f0",
};

const formatNationalId = (rawDigits) => {
  const v = (rawDigits || "").replace(/\D/g, "").slice(0, 13);
  if (v.length <= 4) return v;
  if (v.length <= 9) return `${v.slice(0, 4)} ${v.slice(4)}`;
  return `${v.slice(0, 4)} ${v.slice(4, 9)} ${v.slice(9, 13)}`;
};

const AppointmentList = memo(function AppointmentList({
  appointmentsData,
  appointmentScope,
  setAppointmentScope,
}) {
  const [t] = useTranslation("global");

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
          <div style={{ fontSize: 18, fontWeight: 700, color: "#262626" }}>
            {t("appointment.title")}
          </div>
          <div style={{ fontSize: 13, color: "#8c8c8c", marginTop: 4 }}>
            {t("appointment.subtitle")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Segmented
            value={appointmentScope}
            onChange={setAppointmentScope}
            options={[
              {
                label: t("appointment.todayOnly"),
                value: "today",
              },
              {
                label: t("appointment.todayAndFuture"),
                value: "future",
              },
            ]}
          />

          <div style={{ fontSize: 13, color: "#595959", fontWeight: 600 }}>
            {appointmentsData.length} {t("appointment.scheduled")}
          </div>
        </div>
      </div>

      {appointmentsData.length === 0 ? (
        <div style={{ padding: "18px 0 6px 0", color: "#8c8c8c" }}>
          {appointmentScope === "today"
            ? t("appointment.noneToday")
            : t("appointment.noneTodayOrFuture")}
        </div>
      ) : (
        <>
          <div className="appointments-desktop" style={{ marginTop: 12 }}>
            {appointmentsData.map((appt) => (
              <div key={appt.id} style={appointmentRowStyle}>
                <div>
                  <div style={appointmentCellLabelStyle}>
                    {t("appointment.time")}
                  </div>
                  <div style={appointmentCellValueStyle}>
                    {appt.appointmentDateTime}
                  </div>
                </div>

                <div>
                  <div style={appointmentCellLabelStyle}>{t("patient")}</div>
                  <div style={appointmentCellValueStyle}>
                    <div style={{ fontWeight: 600 }}>{appt.patientName}</div>

                    {appt.nationalIdNumber ? (
                      <div>
                        {t("NATIONAL_ID_NUMBER")}:{" "}
                        {formatNationalId(appt.nationalIdNumber)}
                      </div>
                    ) : null}

                    {appt.phone ? (
                      <div>
                        {t("common.phone")} {appt.phone}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div style={appointmentCellLabelStyle}>
                    {t("appointment.details")}
                  </div>
                  <div style={appointmentCellValueStyle}>
                    {appt.visitType ? <div>{appt.visitType}</div> : null}
                    {appt.reasonForVisit ? (
                      <div>{appt.reasonForVisit}</div>
                    ) : null}
                    {appt.ageGroup || appt.gender ? (
                      <div>
                        {[appt.ageGroup, appt.gender]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <Button disabled>{t("appointment.admit")}</Button>
                  <Button danger disabled>
                    {t("appointment.cancel")}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div
            className="appointments-mobile"
            style={{ display: "none", marginTop: 12 }}
          >
            {appointmentsData.map((appt) => (
              <div
                key={`${appt.id}-mobile`}
                style={mobileAppointmentBlockStyle}
              >
                <div>
                  <div style={appointmentCellLabelStyle}>
                    {t("appointment.time")}
                  </div>
                  <div style={appointmentCellValueStyle}>
                    {appt.appointmentDateTime}
                  </div>
                </div>

                <div>
                  <div style={appointmentCellLabelStyle}>{t("patient")}</div>
                  <div style={appointmentCellValueStyle}>
                    <div style={{ fontWeight: 600 }}>{appt.patientName}</div>

                    {appt.nationalIdNumber ? (
                      <div>
                        {t("NATIONAL_ID_NUMBER")}:{" "}
                        {formatNationalId(appt.nationalIdNumber)}
                      </div>
                    ) : null}

                    {appt.phone ? (
                      <div>
                        {t("common.phone")} {appt.phone}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div style={appointmentCellLabelStyle}>
                    {t("appointment.details")}
                  </div>
                  <div style={appointmentCellValueStyle}>
                    {appt.visitType ? <div>{appt.visitType}</div> : null}
                    {appt.reasonForVisit ? (
                      <div>{appt.reasonForVisit}</div>
                    ) : null}
                    {appt.location ? <div>{appt.location}</div> : null}
                    {appt.ageGroup || appt.gender ? (
                      <div>
                        {[appt.ageGroup, appt.gender]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Button disabled block>
                    {t("appointment.admit")}
                  </Button>
                  <Button danger disabled block>
                    {t("appointment.cancel")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

const Anfitrion = () => {
  useHideMenu(true);

  const [rowsRaw, setRowsRaw] = useState([]);
  const [statsData, setStatsData] = useState([]);
  const [appointmentsRaw, setAppointmentsRaw] = useState([]);
  const [appointmentScope, setAppointmentScope] = useState("today");
  const [t] = useTranslation("global");
  const navigate = useNavigate();

  const { todayTimestamp, tomorrowTimestamp } = useMemo(
    () => getTodayAndTomorrowTimestamps(),
    [],
  );

  const { locationId, selectedLocation } = useServiceLocation();

  const locationFilterId = locationId === "__ALL__" ? null : locationId;

  const locationFilterName =
    locationId === "__ALL__" ? null : selectedLocation?.name || null;
  useEffect(() => {
    const baseConstraints = [
      where("start_time", ">=", todayTimestamp),
      where("start_time", "<", tomorrowTimestamp),
      where("complete", "==", false),
    ];

    const constraints = locationFilterId
      ? [...baseConstraints, where("location_id", "==", locationFilterId)]
      : baseConstraints;

    const q = query(collection(firestore, "patients"), ...constraints);

    const unsubscribePatients = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRowsRaw(rows);
    });

    return () => unsubscribePatients();
  }, [todayTimestamp, tomorrowTimestamp, locationFilterId]);

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
  }, [
    todayTimestamp,
    tomorrowTimestamp,
    locationFilterId,
    locationFilterName,
    appointmentScope,
  ]);

  useEffect(() => {
    let isMounted = true;
    const dateRange = [todayTimestamp, tomorrowTimestamp];

    fetchData({
      dateRange,
      setData: () => {},
      setPatientsChanged: () => {},
      setStatsData,
      isMounted,
    });

    return () => {
      isMounted = false;
    };
  }, [todayTimestamp, tomorrowTimestamp, setStatsData]);

  const stationMetrics = useMemo(() => {
    const map = new Map();
    statsData.forEach((s) => {
      if (s?.station_type) map.set(s.station_type, s);
    });
    return map;
  }, [statsData]);

  const stationNames = useMemo(() => {
    const stations = statsData
      .filter(
        (s) =>
          !!s.station_type && (s.display === undefined || s.display === true),
      )
      .map((s) => ({
        name: s.station_type,
        order:
          typeof s.sort_order === "number"
            ? s.sort_order
            : Number.POSITIVE_INFINITY,
      }));

    const orderMap = new Map();
    stations.forEach(({ name, order }) => {
      if (!orderMap.has(name)) {
        orderMap.set(name, order);
      } else {
        orderMap.set(name, Math.min(orderMap.get(name), order));
      }
    });

    return Array.from(orderMap.entries())
      .sort((a, b) => {
        const [nameA, orderA] = a;
        const [nameB, orderB] = b;
        if (orderA !== orderB) return orderA - orderB;
        return String(nameA).localeCompare(String(nameB));
      })
      .map(([name]) => name);
  }, [statsData]);

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
      }));
  }, [appointmentsRaw, getAppointmentMs, formatAppointmentDateTime]);

  const dataSource = useMemo(() => {
    if (!Array.isArray(rowsRaw)) return [];

    const toMs = (val) => {
      if (val instanceof Timestamp) return val.toMillis();
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
    };

    const nowMs = Timestamp.now().toMillis();

    const sorted = [...rowsRaw].sort(
      (a, b) => toMs(a?.start_time) - toMs(b?.start_time),
    );

    return sorted.map((item) => {
      const stations = {};
      const elapsedMinsCandidates = [];

      (item.plan_of_care ?? []).forEach((plan) => {
        stations[plan.station] = plan.status;

        if (
          plan.status === "waiting" &&
          plan.waiting_start instanceof Timestamp
        ) {
          elapsedMinsCandidates.push(
            Math.floor((nowMs - plan.waiting_start.toMillis()) / 60000),
          );
        } else if (
          plan.status === "in_process" &&
          plan.in_process_start instanceof Timestamp
        ) {
          elapsedMinsCandidates.push(
            Math.floor((nowMs - plan.in_process_start.toMillis()) / 60000),
          );
        }
      });

      const current_process = elapsedMinsCandidates.length
        ? Math.max(...elapsedMinsCandidates)
        : 0;

      const minutesSinceStart = Math.round(
        (nowMs - toMs(item.start_time)) / 60000,
      );

      return {
        pt_no: item.pt_no,
        patient_name:
          (item.patient_name ?? "") +
          "\n" +
          (item.national_id_number ?? "") +
          "\n" +
          (item.reason_for_visit ?? "") +
          "\n" +
          t(item.type_of_visit) +
          "\n" +
          (item.tel ?? " "),
        wtg_time: `${current_process}\n${minutesSinceStart}`,
        ...stations,
      };
    });
  }, [rowsRaw, t]);

  const iconMap = useMemo(
    () => ({
      pending: not_planned,
      in_process,
      waiting,
      obs: eye,
      complete,
      2: two,
      3: three,
      4: four,
      5: five,
      6: six,
      7: seven,
      fin,
    }),
    [],
  );

  const STATUS_CHOICES = useMemo(
    () => [
      ["pending", not_planned],
      ["in_process", in_process],
      ["waiting", waiting],
      ["obs", eye],
      ["complete", complete],
      ["2", two],
      ["3", three],
      ["4", four],
      ["5", five],
      ["6", six],
      ["7", seven],
    ],
    [],
  );

  const renderStatusIcon = useCallback(
    (status, stationName, pt_no) => {
      const src = iconMap[status];
      if (!src) return null;

      const iconScale = 1.5;
      const popContent = (
        <Space wrap>
          {STATUS_CHOICES.map(([nextStatus, imgSrc]) => (
            <img
              key={nextStatus}
              src={imgSrc}
              width={IconSizes.width * iconScale}
              height={IconSizes.height * iconScale}
              loading="lazy"
              decoding="async"
              alt=""
              style={{ cursor: "pointer" }}
              onClick={() =>
                handleStatusChange(
                  nextStatus,
                  pt_no,
                  stationName,
                  t("CHECKOUT"),
                )
              }
            />
          ))}
        </Space>
      );

      return (
        <Popover content={popContent} title={t("modifyStatus")} trigger="hover">
          <img
            src={src}
            width={IconSizes.height}
            height={IconSizes.height}
            loading="lazy"
            decoding="async"
            alt=""
          />
        </Popover>
      );
    },
    [STATUS_CHOICES, t, iconMap],
  );

  const columns = useMemo(() => {
    const patientCol = {
      title: t("patient"),
      dataIndex: "patient_name",
      key: "patient",
      fixed: "left",
      render: (name, record) => (
        <table>
          <tbody>
            <tr>
              <td>
                <b> {String(name).split("\n")[0]} </b>
                <br /> {t("NATIONAL_ID_NUMBER")}:{" "}
                {formatNationalId(String(name).split("\n")[1])}
                <br /> {String(name).split("\n")[2]} <br />
                <i>{String(name).split("\n")[3]} </i>
                <br />
                {t("common.phone")} {String(name).split("\n")[4]}{" "}
              </td>
              <td align="right">
                <Popover
                  content={
                    <Suspense
                      fallback={
                        <div style={{ padding: 8 }}>{t("common.loading")}</div>
                      }
                    >
                      <EditPatientData
                        initialValues={{
                          paciente: String(name).split("\n")[0],
                          national_id_number: String(name).split("\n")[1],
                          tel: String(name).split("\n")[4],
                          motivo: String(name).split("\n")[2],
                          pt_no: record.pt_no,
                        }}
                        onSave={() => console.log("Patient data saved")}
                      />
                    </Suspense>
                  }
                  title={t("EDITPATIENTDATA")}
                  trigger="click"
                >
                  <img
                    src={edit}
                    width={IconSizes.height}
                    height={IconSizes.height}
                    loading="lazy"
                    decoding="async"
                    alt=""
                    style={{ cursor: "pointer" }}
                  />
                </Popover>
              </td>
            </tr>
          </tbody>
        </table>
      ),
    };

    const stationCols = stationNames.map((stationName) => {
      const metrics = stationMetrics.get(stationName) || {};
      const avgMs = metrics.avg_waiting_time ?? 0;
      const maxSec = metrics.max_waiting_time ?? 0;
      const isOverLimit = avgMs / 1000 > maxSec;
      const waitTextMin = Math.round(avgMs / 60000);

      return {
        dataIndex: stationName,
        key: stationName,
        title: (
          <div>
            {t(stationName)}
            <div
              className="wait_times"
              style={{
                color: isOverLimit ? "red" : "black",
                fontWeight: isOverLimit ? "bold" : "normal",
              }}
            >
              {waitTextMin}m
            </div>
          </div>
        ),
        render: (status, row) =>
          renderStatusIcon(status, stationName, row.pt_no),
        width: IconSizes.width,
        align: "center",
      };
    });

    const waitingCol = {
      title: t("waitingTime"),
      dataIndex: "wtg_time",
      key: "wtg_time",
      width: 70,
      align: "center",
      fixed: "right",
      render: (wtg_time) => {
        const displayValue = Number(String(wtg_time).split("\n")[0]) || 0;
        const style = {
          fontSize: "18px",
          color: displayValue > 15 ? "red" : "black",
        };
        return (
          <span style={style}>
            {String(wtg_time).split("\n")[0]} {t("common.minutesShort")} <hr />
            <h5>
              {String(wtg_time).split("\n")[1]} {t("common.minutesShort")}
            </h5>
          </span>
        );
      },
    };

    const actionCol = {
      title: t("action"),
      dataIndex: "pt_no",
      key: "estado",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Popconfirm
          title={t("areYouSure")}
          onConfirm={() => handleDelete(record.pt_no, navigate)}
        >
          <img
            src={fin}
            width={IconSizes.height}
            height={IconSizes.height}
            loading="lazy"
            decoding="async"
            alt=""
            style={{ cursor: "pointer" }}
          />
        </Popconfirm>
      ),
    };

    return [patientCol, ...stationCols, waitingCol, actionCol];
  }, [t, stationNames, stationMetrics, navigate, renderStatusIcon]);

  const getRowClassName = (record, index) => {
    const allPendingOrComplete = stationNames.every((st) => {
      const status = record[st];
      return status === "pending" || status === "complete";
    });

    return allPendingOrComplete
      ? "highlight-row"
      : index % 2 === 0
        ? "even-row"
        : "odd-row";
  };

  return (
    <>
      <AlertInfo />

      <Table
        rowKey={"pt_no"}
        columns={columns}
        dataSource={
          Array.isArray(rowsRaw) && rowsRaw.some((d) => d === undefined)
            ? []
            : dataSource
        }
        pagination={false}
        scroll={{ y: 850 }}
        sticky={{ offsetHeader: 0 }}
        rowClassName={getRowClassName}
      />

      <AppointmentList
        appointmentsData={appointmentsData}
        appointmentScope={appointmentScope}
        setAppointmentScope={setAppointmentScope}
      />
    </>
  );
};

export default Anfitrion;
