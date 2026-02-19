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
import { keyframes } from "styled-components";

import TopBar from "../layout/TopBar";

import { firestore } from "./../helpers/firebaseConfig";
import { useHideMenu } from "../hooks/useHideMenu";
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

/**
 * Wrapper styling updated to match the mock:
 * - deep blue page background
 * - centered, rounded white card
 * - generous padding/margins
 *
 * NOTE: the Table itself (columns/data/renderers) is unchanged.
 */

const turnoPulse = keyframes`
  0%   { transform: scale(1);    opacity: 0.95; }
  70%  { transform: scale(1.22); opacity: 0; }
  100% { transform: scale(1.22); opacity: 0; }
`;

const Page = styled.div`
  min-height: 100vh;
  background: #2b2f87; /* deep blue */
  display: flex;
  flex-direction: column;
`;

/* Teal header band (public page style) */
const TopHero = styled.div`
  background: #1db7a6; /* teal */
  padding: 24px 40px 48px;
  border-bottom-left-radius: 40px;
  border-bottom-right-radius: 40px;

  /* Make the inner header content centered */
  .heroInner {
    max-width: 1500px;
    margin: 0 auto;
  }
`;

/* White rounded card */
const TurnoCardWrapper = styled.div`
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 26px; /* pulls card up into teal */
  padding: 0 34px 60px;

  .turnoOuter {
    width: 100%;
    max-width: clamp(900px, 92vw, 1200px);
    margin: 0 auto;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .patientName {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
  }

  .turnoCard {
    background: #ffffff;
    border-radius: 34px;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
    overflow: hidden;

    flex: 0 0 auto;
    min-height: 0;
    display: flex;
    max-height: calc(100vh - 220px);
    flex-direction: column;
  }

  .turnoTableWrap {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .doneBadge {
    position: absolute;
    right: -8px;
    bottom: -8px;

    width: 24px;
    height: 24px;

    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 3;
  }

  .patientCell {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .progressDots {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 14px; /* ensures they occupy space */
    margin-top: 2px; /* keeps off the very top edge */
  }

  .doneBadge svg {
    width: 65%;
    height: 65%;
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

  .progressDots {
    position: relative;
    z-index: 2;
  }

  .stationIcon {
    position: relative;
    display: inline-block;
    overflow: visible; /* IMPORTANT: pulse can expand */
    border-radius: 999px;
  }

  .pulseRing {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    box-sizing: border-box;
    border: 6px solid var(--pulse-color, rgba(255, 255, 255, 0.95));
    opacity: 0.95;
    pointer-events: none;
    z-index: 2;

    animation: ${turnoPulse} 1.6s ease-out infinite;
  }

  .pulseRing.waiting {
    --pulse-color: rgba(255, 255, 255, 0.95);
    animation-duration: 2.2s;
  }

  .pulseRing.in_process {
    --pulse-color: rgba(255, 255, 255, 0.95);
    animation-duration: 1.5s;
  }

  /* Ensure icon image is below the ring */
  .stationIcon .ant-image {
    position: relative;
    z-index: 1;
  }

  /* ===== TABLE HEADER STYLING ===== */

  .ant-table-thead > tr > th {
    background: #f47b20 !important; /* <-- replace with exact orange */
    color: #ffffff !important;
    font-weight: 600;
    font-size: 16px;
    border-bottom: none !important;
  }

  /* Remove default grey separator line */
  .ant-table-thead > tr > th::before {
    display: none !important;
  }

  /* Optional: soften header corners inside white card */
  .ant-table-thead > tr > th:first-child {
    border-top-left-radius: 24px;
  }

  .ant-table-thead > tr > th:last-child {
    border-top-right-radius: 24px;
  }

  .waitingBadge {
    position: absolute;
    left: 44px;
    bottom: -6px;

    width: 24px;
    height: 24px;

    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    display: grid;
    place-items: center;

    pointer-events: none;
    z-index: 3;

    /* icon color */
    color: #0f172a;
  }

  .waitingBadge svg {
    width: 85%;
    height: 85%;
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

function WaitingBadge() {
  // simple "stopwatch/clock" glyph (inline SVG), no extra deps
  return (
    <span className="waitingBadge" aria-label="Waiting">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {/* top button */}
        <path
          d="M9 2h6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* body circle */}
        <circle
          cx="12"
          cy="13"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        {/* hand */}
        <path
          d="M12 13V9.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* small hand */}
        <path
          d="M12 13l2.6 1.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function Turno() {
  const { locationId } = useServiceLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  const locationFilterId = locationId === "__ALL__" ? null : locationId;
  const [tableScrollY, setTableScrollY] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const wrapH = el.getBoundingClientRect().height;

      const thead = el.querySelector(".ant-table-thead");
      const headH = thead ? thead.getBoundingClientRect().height : 0;

      const FUDGE = 20; // <-- make 28 if you still want more breathing room

      const y = Math.max(200, Math.floor(wrapH - headH - FUDGE));
      setTableScrollY(y);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);

    return () => clearInterval(interval);
  }, []);
  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [currentTime]);

  useHideMenu(true);
  const [t] = useTranslation("global");

  const [patients, setPatients] = useState([]);
  const [dayWindow, setDayWindow] = useState(() => getDayWindow());

  const tableRef = useRef(null);
  const scrollSpeed = 1;
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
      const norm = String(status || "")
        .trim()
        .toLowerCase();

      // not planned / unscheduled
      if (!norm || norm === "pending") return null;

      const src = getStationIconSrc(station);
      if (!src) return null;

      const showPulse = norm === "in_process"; // keep pulse capability, but waiting no longer pulses
      const showWaiting = norm === "waiting";
      const showCheck = norm === "complete";

      return (
        <span className="stationIcon">
          {/* Keep pulse element available for future, but only show for in_process */}
          {showPulse ? <span className={`pulseRing ${norm}`} /> : null}

          <Image src={src} width={iconSize} height={iconSize} preview={false} />

          {/* Waiting indicator overlay (replaces pulse for waiting) */}
          {showWaiting ? <WaitingBadge /> : null}

          {/* Completed indicator */}
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

      const atBottom =
        tableBody.scrollTop + tableBody.clientHeight >=
        tableBody.scrollHeight - 2;

      if (atBottom) {
        tableBody.scrollTop = 0;
      } else {
        tableBody.scrollTop += scrollSpeed;
      }
    }, 50);

    return () => clearInterval(scrollInterval);
  }, [scrollSpeed, dataSource]); // or [scrollSpeed, dataSource.length]

  return (
    <Page>
      {/* Teal public header */}
      <TopHero>
        <div className="heroInner">
          <TopBar
            t={t}
            transparent
            formattedTime={formattedTime}
            isDev={false}
          />
        </div>
      </TopHero>

      {/* White card */}
      <TurnoCardWrapper $iconSize={iconSize} style={{ flex: 1, minHeight: 0 }}>
        <div
          className="turnoOuter"
          style={{ flex: 1, minHeight: 0, display: "flex" }}
        >
          <div
            className="turnoCard"
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="turnoTableWrap"
              ref={tableRef}
              style={{ flex: 1, minHeight: 0 }}
            >
              <Table
                rowKey="pt_no"
                columns={columns}
                dataSource={dataSource}
                scroll={{ y: tableScrollY }}
                pagination={false}
                rowClassName={getRowClassName}
              />
            </div>
          </div>
        </div>
      </TurnoCardWrapper>
    </Page>
  );
}
