import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { Table, Image } from "antd";
import styled from "styled-components";
import {
  collection,
  onSnapshot,
  Timestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";

import { firestore } from "./../helpers/firebaseConfig";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import { useTranslation } from "react-i18next";
import { useServiceLocation } from "../providers/ServiceLocationProvider";

import IconSizes from "../helpers/iconSizes";

// --- Station icon loader: expects icons named <station>.png (e.g. doc.png) ---
// Put these PNGs in ../img/stations/ (or change the path below).
// Example: src/img/stations/doc.png, src/img/stations/pt.png, etc.
const stationIconsContext = require.context("../img/stations", false, /\.png$/);

const stationIconMap = stationIconsContext.keys().reduce((acc, key) => {
  // key looks like "./doc.png"
  const file = key.replace("./", ""); // "doc.png"
  const stationName = file.replace(".png", ""); // "doc"
  acc[stationName] = stationIconsContext(key);
  return acc;
}, {});

function getStationIconSrc(station) {
  return stationIconMap[String(station || "").toLowerCase()] || null;
}

function getDayWindow() {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );

  return {
    todayTs: Timestamp.fromDate(today),
    tomorrowTs: Timestamp.fromDate(tomorrow),
    tomorrowDate: tomorrow,
  };
}

const Page = styled.div`
  .turnoTableWrap {
    height: 600px;
    overflow: hidden;
  }

  .ant-image {
    display: inline-block;
  }

  /* Let the pulse extend outside AntD cells */
  .ant-table-cell {
    overflow: visible !important;
  }

  /* ---- Station Icon wrapper ---- */
  .stationIcon {
    position: relative;
    display: inline-block;
    width: ${(p) => p.$iconSize}px;
    height: ${(p) => p.$iconSize}px;
    overflow: visible;
  }

  /* Pulse ring element (behind icon) */
  .pulseRing {
    position: absolute;
    inset: -8px;
    border-radius: 999px;
    border: 4px solid rgba(255, 255, 255, 0.9);
    animation: turnoPulse 1.6s ease-out infinite;
    pointer-events: none;
    z-index: 0;
  }

  @keyframes turnoPulse {
    0% {
      transform: scale(1);
      opacity: 0.95;
    }
    70% {
      transform: scale(1.25);
      opacity: 0;
    }
    100% {
      transform: scale(1.25);
      opacity: 0;
    }
  }

  /* Keep icon above the ring */
  .stationIcon .ant-image {
    position: relative;
    z-index: 1;
  }

  /* ---- Completed badge (above everything) ---- */
  .doneBadge {
    position: absolute;
    right: -6px;
    bottom: -6px;
    width: ${(p) => Math.round(p.$iconSize * 0.44)}px;
    height: ${(p) => Math.round(p.$iconSize * 0.44)}px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 2;
  }

  .doneBadge svg {
    width: 65%;
    height: 65%;
  }

  /* ---- Progress dots ---- */
  .progressDots {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
  }

  .dot.done {
    background: #0f172a;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .dot.todo {
    background: transparent;
    border: 2px solid rgba(15, 23, 42, 0.28);
  }

  .patientCell {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .patientName {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.1;
  }
`;

function CheckBadge() {
  return (
    <span className="doneBadge">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 6L9 17l-5-5"
          fill="none"
          stroke="#0F172A"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ProgressDots({ total = 0, completeCount = 0 }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeComplete = Math.min(
    safeTotal,
    Math.max(0, Number(completeCount) || 0),
  );
  if (safeTotal === 0) return null;

  return (
    <span className="progressDots">
      {Array.from({ length: safeTotal }).map((_, i) => {
        const done = i < safeComplete;
        return <span key={i} className={`dot ${done ? "done" : "todo"}`} />;
      })}
    </span>
  );
}

function getProgressCounts(patient) {
  const steps = Array.isArray(patient?.plan_of_care)
    ? patient.plan_of_care
    : [];

  const planned = steps.filter((s) => s?.status && s.status !== "pending");
  const total = planned.length;

  const completeCount = planned.filter((s) => s?.status === "complete").length;

  return { total, completeCount };
}

export default function Turno() {
  const { locationId } = useServiceLocation();
  const locationFilterId = locationId === "__ALL__" ? null : locationId;

  useHideMenu(true);
  const [t] = useTranslation("global");

  const [patients, setPatients] = useState([]);
  const [dayWindow, setDayWindow] = useState(() => getDayWindow());

  const tableRef = useRef(null);
  const scrollSpeed = 2;
  const scrollingRef = useRef(true);

  const iconSize = IconSizes?.width ?? 44;

  // midnight rollover
  useEffect(() => {
    const msUntilTomorrow =
      dayWindow.tomorrowDate.getTime() - Date.now() + 1000;
    const timer = setTimeout(
      () => setDayWindow(getDayWindow()),
      Math.max(1000, msUntilTomorrow),
    );
    return () => clearTimeout(timer);
  }, [dayWindow.tomorrowDate]);

  // realtime listener: today + complete==false + optional location_id
  useEffect(() => {
    const patientsRef = collection(firestore, "patients");

    const constraints = [
      where("last_update", ">=", dayWindow.todayTs),
      where("last_update", "<", dayWindow.tomorrowTs),
      where("complete", "==", false),
      orderBy("last_update", "asc"),
    ];

    if (locationFilterId) {
      constraints.unshift(where("location_id", "==", locationFilterId));
    }

    const q = query(patientsRef, ...constraints);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((doc) => {
          const d = doc.data() ?? {};
          const last = d.last_update?.toDate?.();
          const start_time = last ? last.toISOString() : null;

          return {
            ...d,
            start_time,
            pt_no: d.pt_no ?? doc.id,
          };
        });

        setPatients(next);
      },
      (err) => {
        console.error("Turno realtime listener error:", err);
        setPatients([]);
      },
    );

    return () => unsub();
  }, [locationFilterId, dayWindow.todayTs, dayWindow.tomorrowTs]);

  // Render a station cell using station icon + status styling
  const renderStationCell = useCallback(
    ({ station, status }) => {
      // Unscheduled / not planned: blank
      // per your spec: "pending" means not planned for this patient
      if (!status || status === "pending") return null;

      const src = getStationIconSrc(station);
      if (!src) return null;

      const showPulse = status === "in_process";
      const showCheck = status === "complete";

      // waiting / "2" / "3" / "4" / etc => icon only
      return (
        <span className="stationIcon">
          {showPulse ? <span className="pulseRing" /> : null}
          <Image src={src} width={iconSize} height={iconSize} preview={false} />
          {showCheck ? <CheckBadge /> : null}
        </span>
      );
    },
    [iconSize],
  );

  // columns + datasource
  const { columns, dataSource } = useMemo(() => {
    const extracted = Array.isArray(patients) ? [...patients] : [];

    extracted.sort((a, b) => {
      const ta = new Date(a?.start_time ?? 0).getTime();
      const tb = new Date(b?.start_time ?? 0).getTime();
      return ta - tb;
    });

    const uniqueStations = {};

    extracted.forEach((pt) => {
      (pt?.plan_of_care ?? []).forEach((plan) => {
        if (!plan?.station) return;

        const station = String(plan.station);

        if (!uniqueStations[station]) {
          uniqueStations[station] = {
            dataIndex: station,
            key: station,
            title: t(station),
            // IMPORTANT: pass station name into the renderer
            render: (status) => renderStationCell({ station, status }),
            width: 78,
            align: "center",
          };
        }
      });
    });

    const patientColumn = {
      title: t("patient"),
      dataIndex: "patient_name",
      key: "patient",
      width: 260,
      fixed: "left",
      render: (_, record) => {
        const raw = record.__rawPatient;
        const { total, completeCount } = getProgressCounts(raw);

        return (
          <div className="patientCell">
            <ProgressDots total={total} completeCount={completeCount} />
            <div className="patientName">{record.patient_name}</div>
          </div>
        );
      },
    };

    const cols = [patientColumn, ...Object.values(uniqueStations)];

    const rows = extracted.map((pt) => {
      const stations = {};
      (pt?.plan_of_care ?? []).forEach((plan) => {
        if (!plan?.station) return;
        stations[String(plan.station)] = plan.status;
      });

      return {
        pt_no: pt.pt_no,
        patient_name: pt.patient_name,
        ...stations,
        __rawPatient: pt,
      };
    });

    return { columns: cols, dataSource: rows };
  }, [patients, t, renderStationCell]);

  const getRowClassName = (_, index) =>
    index % 2 === 0 ? "even-row" : "odd-row";

  // auto-scroll table body
  useEffect(() => {
    const tableBody = tableRef.current?.querySelector(".ant-table-body");
    if (!tableBody) return;

    const scrollInterval = setInterval(() => {
      if (!scrollingRef.current) return;

      if (
        tableBody.scrollTop + tableBody.clientHeight >=
        tableBody.scrollHeight
      ) {
        tableBody.scrollTop = 0;
      } else {
        tableBody.scrollTop += scrollSpeed;
      }
    }, 50);

    return () => clearInterval(scrollInterval);
  }, [scrollSpeed]);

  return (
    <Page $iconSize={iconSize}>
      <AlertInfo />
      <div className="turnoTableWrap" ref={tableRef}>
        <Table
          rowKey="pt_no"
          columns={columns}
          dataSource={dataSource}
          scroll={{ y: 600 }}
          pagination={false}
          rowClassName={getRowClassName}
        />
      </div>
    </Page>
  );
}
