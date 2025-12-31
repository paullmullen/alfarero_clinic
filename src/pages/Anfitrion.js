// Anfitrion.js (Step 2 with stable station order via statsData.sort_order)
import React, { useEffect, useState, useMemo } from "react";
import { Table, Image, Space, Popover, Popconfirm } from "antd";
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
import EditPatientData from "../components/EditPatientData.js";
import { getTodayAndTomorrowTimestamps } from "../helpers/dateHelpers";

const Anfitrion = () => {
  useHideMenu(true);

  const [rowsRaw, setRowsRaw] = useState([]); // snapshot docs for today's patients
  const [statsData, setStatsData] = useState([]); // station metrics (includes sort_order)
  const [hoveredRowKey, setHoveredRowKey] = useState(null);
  const [station, setStation] = useState("");
  const [t] = useTranslation("global");
  const navigate = useNavigate();

  const handleMouseEnter = (record) => setHoveredRowKey(record.pt_no);
  const handleMouseLeave = () => setHoveredRowKey(null);
  const onSave = () => {
    console.log("Patient data saved");
  };

  const { todayTimestamp, tomorrowTimestamp } = getTodayAndTomorrowTimestamps();

  // 🔴 Filtered real-time listener for today's patients
  useEffect(() => {
    const q = query(
      collection(firestore, "patients"),
      where("start_time", ">=", todayTimestamp),
      where("start_time", "<", tomorrowTimestamp),
      where("complete", "==", false)
    );

    const unsubscribePatients = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRowsRaw(rows);
    });

    return () => unsubscribePatients();
  }, [todayTimestamp, tomorrowTimestamp]);

  // Load only station stats (keeps Step-1 behavior but avoids reloading patient rows)
  useEffect(() => {
    let isMounted = true;
    const dateRange = [todayTimestamp, tomorrowTimestamp];

    fetchData({
      dateRange,
      setData: () => {}, // no-op: rows come from snapshot above
      setPatientsChanged: () => {}, // no-op
      setStatsData,
      isMounted,
    });

    return () => {
      isMounted = false;
    };
  }, [todayTimestamp, tomorrowTimestamp, setStatsData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Memoized helpers and derived data (with stable station order)
  // ─────────────────────────────────────────────────────────────────────────────

  // Station metrics map for O(1) lookup in column titles
  const stationMetrics = useMemo(() => {
    const map = new Map();
    statsData.forEach((s) => {
      if (s?.station_type) map.set(s.station_type, s);
    });
    return map;
  }, [statsData]);

  // List of station names sorted by statsData.sort_order (ascending, tie-break alphabetically)
  const stationNames = useMemo(() => {
    // Keep only stations with a station_type
    const stations = statsData

      .filter(
        (s) =>
          !!s.station_type && (s.display === undefined || s.display === true)
      )
      .map((s) => ({
        name: s.station_type,
        order:
          typeof s.sort_order === "number"
            ? s.sort_order
            : Number.POSITIVE_INFINITY,
      }));

    // Deduplicate by name, taking the lowest sort_order if duplicates exist
    const orderMap = new Map();
    stations.forEach(({ name, order }) => {
      if (!orderMap.has(name)) {
        orderMap.set(name, order);
      } else {
        orderMap.set(name, Math.min(orderMap.get(name), order));
      }
    });

    // Build array and sort by sort_order asc; tie-break alphabetically
    const sortedNames = Array.from(orderMap.entries())
      .sort((a, b) => {
        const [nameA, orderA] = a;
        const [nameB, orderB] = b;
        if (orderA !== orderB) return orderA - orderB;
        return String(nameA).localeCompare(String(nameB));
      })
      .map(([name]) => name);

    return sortedNames;
  }, [statsData]);

  // Compute table rows once (sorted), including wtg_time and per-station statuses
  const dataSource = useMemo(() => {
    if (!Array.isArray(rowsRaw)) return [];

    // Helper to turn Firestore Timestamp or Date string into ms
    const toMs = (val) => {
      if (val instanceof Timestamp) return val.toMillis();
      const d = new Date(val);
      return isNaN(d.getTime()) ? Date.now() : d.getTime();
    };

    const nowMs = Timestamp.now().toMillis();

    // Sort by start_time asc
    const sorted = [...rowsRaw].sort(
      (a, b) => toMs(a?.start_time) - toMs(b?.start_time)
    );

    return sorted.map((item) => {
      // Build map station -> status; compute current_process and total minutes
      const stations = {};
      const elapsedMinsCandidates = [];

      (item.plan_of_care ?? []).forEach((plan) => {
        stations[plan.station] = plan.status;

        if (
          plan.status === "waiting" &&
          plan.waiting_start instanceof Timestamp
        ) {
          elapsedMinsCandidates.push(
            Math.floor((nowMs - plan.waiting_start.toMillis()) / 60000)
          );
        } else if (
          plan.status === "in_process" &&
          plan.in_process_start instanceof Timestamp
        ) {
          elapsedMinsCandidates.push(
            Math.floor((nowMs - plan.in_process_start.toMillis()) / 60000)
          );
        }
      });

      const current_process = elapsedMinsCandidates.length
        ? Math.max(...elapsedMinsCandidates)
        : 0;

      const minutesSinceStart = Math.round(
        (nowMs - toMs(item.start_time)) / 60000
      );

      return {
        pt_no: item.pt_no,
        patient_name:
          (item.patient_name ?? "") +
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

  // Memoized status icon popover content (uses hoveredRowKey + station from hover)
  const iconScale = 1.5;
  const editStatusContent = (
    <Space wrap>
      <Image
        src={not_planned}
        width={IconSizes.width * iconScale}
        height={IconSizes.height * iconScale}
        preview={false}
        onClick={() =>
          handleStatusChange("pending", hoveredRowKey, station, t("CHECKOUT"))
        }
      />
      <Image
        src={in_process}
        width={IconSizes.width * iconScale}
        height={IconSizes.height * iconScale}
        preview={false}
        onClick={() =>
          handleStatusChange(
            "in_process",
            hoveredRowKey,
            station,
            t("CHECKOUT")
          )
        }
      />
      <Image
        src={waiting}
        width={IconSizes.width * iconScale}
        height={IconSizes.height * iconScale}
        preview={false}
        onClick={() =>
          handleStatusChange("waiting", hoveredRowKey, station, t("CHECKOUT"))
        }
      />
      <Image
        src={eye}
        height={IconSizes.height * iconScale}
        preview={false}
        onClick={() =>
          handleStatusChange("obs", hoveredRowKey, station, t("CHECKOUT"))
        }
      />
      <Image
        src={complete}
        width={IconSizes.width * iconScale}
        height={IconSizes.height * iconScale}
        preview={false}
        onClick={() =>
          handleStatusChange("complete", hoveredRowKey, station, t("CHECKOUT"))
        }
      />
      {[
        ["2", two],
        ["3", three],
        ["4", four],
        ["5", five],
        ["6", six],
        ["7", seven],
      ].map(([val, img]) => (
        <Image
          key={val}
          src={img}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange(val, hoveredRowKey, station, t("CHECKOUT"))
          }
        />
      ))}
    </Space>
  );

  // Stateless renderer for a single status icon (keeps your existing hover behavior)
  const renderStatusIcon = (status, stationName) => {
    const commonProps = {
      width: IconSizes.height,
      height: IconSizes.height,
      preview: false,
      onMouseEnter: () => setStation(stationName),
    };

    const wrap = (src) => (
      <Popover
        content={editStatusContent}
        title={t("modifyStatus")}
        trigger="hover"
      >
        <Image src={src} {...commonProps} />
      </Popover>
    );

    switch (status) {
      case "pending":
        return wrap(not_planned);
      case "in_process":
        return wrap(in_process);
      case "waiting":
        return wrap(waiting);
      case "obs":
        return wrap(eye);
      case "complete":
        return wrap(complete);
      case "2":
        return wrap(two);
      case "3":
        return wrap(three);
      case "4":
        return wrap(four);
      case "5":
        return wrap(five);
      case "6":
        return wrap(six);
      case "7":
        return wrap(seven);
      case "fin":
        return wrap(fin);
      default:
        return null;
    }
  };

  // 🧱 Memoized columns (stable reference for Table), using stationNames sorted by sort_order
  const columns = useMemo(() => {
    // Patient base column
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
                <br /> {String(name).split("\n")[1]} <br />
                <i>{String(name).split("\n")[2]} </i>
                <br />
                {String(name).split("\n")[3]}{" "}
              </td>
              <td align="right">
                <Popover
                  content={
                    <EditPatientData
                      initialValues={{
                        paciente: String(name).split("\n")[0],
                        tel: String(name).split("\n")[3],
                        motivo: String(name).split("\n")[1],
                        pt_no: record.pt_no,
                      }}
                      onSave={onSave}
                    />
                  }
                  title={t("EDITPATIENTDATA")}
                  trigger="click"
                >
                  <Image
                    src={edit}
                    width={IconSizes.height}
                    height={IconSizes.height}
                    preview={false}
                  />
                </Popover>
              </td>
            </tr>
          </tbody>
        </table>
      ),
    };

    // Station columns from statsData (stable, sorted by sort_order asc)
    const stationCols = stationNames.map((stationName) => {
      const metrics = stationMetrics.get(stationName) || {};
      const avgMs = metrics.avg_waiting_time ?? 0; // milliseconds
      const maxSec = metrics.max_waiting_time ?? 0; // seconds
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
        render: (status) => renderStatusIcon(status, stationName),
        width: IconSizes.width,
        align: "center",
      };
    });

    // Waiting time + Action columns
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
            {String(wtg_time).split("\n")[0]} min <hr></hr>
            <h5>{String(wtg_time).split("\n")[1]} min</h5>
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
          <Image
            src={fin}
            width={IconSizes.height}
            height={IconSizes.height}
            preview={false}
          />
        </Popconfirm>
      ),
    };

    return [patientCol, ...stationCols, waitingCol, actionCol];
  }, [t, stationNames, stationMetrics, navigate]);

  // Row class based on all station statuses (uses memoized stationNames)
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

  // ─────────────────────────────────────────────────────────────────────────────

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
        onRow={(record) => ({
          onMouseEnter: () => handleMouseEnter(record),
          onMouseLeave: () => handleMouseLeave(),
        })}
      />
    </>
  );
};

export default Anfitrion;
