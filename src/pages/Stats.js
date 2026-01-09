// src/pages/Stats.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Divider, Button, Form, DatePicker, InputNumber } from "antd";
import { useTranslation } from "react-i18next";
import { getTodayAndTomorrowTimestamps } from "../helpers/dateHelpers";
import ExcelExport from "../helpers/Export";

// Hooks barrel
import {
  useEmailTrigger,
  useDateRange,
  useStationsData,
  usePatientsData,
  useSurveyData,
  useDaysAgoData,
} from "../hooks";

// Components barrel
import { PatientsTable, SurveysTable, LegendTitle } from "../components/stats";

import {
  StationBarChart,
  SatScoreChart,
  ArrivalChart,
  WaitingTimeChart,
  ProcedureTimeChart,
  DemographicsChart,
  RollingAverageChart,
} from "../components/stats/StatCharts";

import es_ES from "antd/es/date-picker/locale/es_ES";
import en_US from "antd/es/date-picker/locale/en_US";

const { RangePicker } = DatePicker;

export default function Stats() {
  const { todayTimestamp, tomorrowTimestamp } = getTodayAndTomorrowTimestamps();
  const { t, i18n } = useTranslation("global");
  const [form] = Form.useForm();

  // 📅 Date range
  const { dateRange, pickerRange, handleDateChange } = useDateRange(
    todayTimestamp,
    tomorrowTimestamp
  );

  // 🔄 Data hooks
  const loadStations = useStationsData();
  const loadPatients = usePatientsData(t);
  const loadSurveys = useSurveyData();
  const loadDaysAgo = useDaysAgoData();
  const { triggerEmail, loading: emailLoading } = useEmailTrigger();

  // 📊 Local state
  const [statsData, setStatsData] = useState([]);
  const [patients, setPatients] = useState([]);
  const [arrivalTimeData, setArrivalTimeData] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [satScore, setSatScore] = useState([]);
  const [ageGender, setAgeGender] = useState([]);
  const [daysAgo, setDaysAgo] = useState([]); // used in trends export
  const [rollingAverages, setRollingAverages] = useState([]);
  const [daysCount, setDaysCount] = useState(60);
  const [columnChanger, setColumnChanger] = useState(false);

  // 🧩 Patients columns (define early and memoize)
  const patientsColumns = useMemo(
    () => [
      {
        title: t("patient"),
        dataIndex: "patient_name",
        key: "patient_name",
        fixed: "left",
        width: 80,
      },
      {
        title: t("age"),
        dataIndex: "age_group",
        key: "age",
        fixed: "left",
        width: 40,
        render: (v) => t(v),
      },
      {
        title: t("gender"),
        dataIndex: "gender",
        key: "gender",
        fixed: "left",
        width: 60,
        render: (v) => t(v),
      },
      {
        title: t("type_of_visit"),
        dataIndex: "type_of_visit",
        key: "type_of_visit",
        width: 80,
        render: (v) => t(v),
      },
      {
        title: t("services"),
        dataIndex: "servicesString",
        key: "servicesString",
        width: 120,
      },
    ],
    [t]
  );

  // 📊 Survey columns (define early and memoize)
  const surveyColumns = useMemo(
    () => [
      {
        title: t("sat"),
        dataIndex: "satisfaction",
        key: "satisfaction",
        width: 40,
      },
      {
        title: t("prayer_request"),
        dataIndex: "prayer_request",
        key: "prayer_request",
        width: 180,
      },
      {
        title: t("gender"),
        dataIndex: "gender",
        key: "gender",
        width: 60,
        render: t,
      },
      {
        title: t("age"),
        dataIndex: "age_group",
        key: "age_group",
        width: 60,
        render: t,
      },
    ],
    [t]
  );

  // ⭐ Legend
  const renderLegendStations = useCallback(
    (which) => {
      const center = { textAlign: "center" };
      const textMap = {
        1: t("patientsPerService"),
        2: t("satscores"),
        3: t("ARRIVAL_TIME"),
        4: t("WAITING_TIME"),
        5: t("DEMOGRAPHICS"),
        6: `${t("LAST")} ${daysCount} ${t("DAYS")}`,
        7: t("PROCEDURE_TIME"),
      };
      return <LegendTitle title={textMap[which]} style={center} />;
    },
    [t, daysCount]
  );

  // ⭐ Date formatting for display
  const formatDate = useCallback(
    (timestamp) => {
      if (!timestamp) return "Loading...";
      return timestamp.toDate().toLocaleDateString(i18n.language, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
    [i18n.language]
  );

  // 📁 Safe date string for filenames (YYYY-MM-DD)
  const formatDateForFile = useCallback((timestamp) => {
    if (!timestamp) return "unknown";
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return Number.isNaN(d.getTime()) ? "unknown" : d.toISOString().slice(0, 10);
  }, []);

  // 🚀 Load everything when dateRange or columnChanger changes
  useEffect(() => {
    const loadAll = async () => {
      const stations = await loadStations();
      setStatsData(stations);

      const { processed, arrival } = await loadPatients(dateRange);
      setPatients(processed);
      setArrivalTimeData(arrival);

      const { surveys: sData, satScore: sSat } = await loadSurveys(dateRange);
      setSurveys(sData);
      setSatScore(sSat);

      const { data: daysData, rolling } = await loadDaysAgo(daysCount);
      setDaysAgo(daysData);
      setRollingAverages(rolling);
    };
    loadAll();
  }, [
    loadStations,
    loadPatients,
    loadSurveys,
    loadDaysAgo,
    dateRange,
    daysCount,
    columnChanger,
  ]);

  // 🧮 Recompute demographics
  useEffect(() => {
    const sums = patients.reduce(
      (acc, p) => {
        acc.adult_masculine +=
          p.gender === "masculine" && p.age_group === "adult" ? 1 : 0;
        acc.adult_feminine +=
          p.gender === "feminine" && p.age_group === "adult" ? 1 : 0;
        acc.child_masculine +=
          p.gender === "masculine" && p.age_group === "child" ? 1 : 0;
        acc.child_feminine +=
          p.gender === "feminine" && p.age_group === "child" ? 1 : 0;
        return acc;
      },
      {
        adult_masculine: 0,
        adult_feminine: 0,
        child_masculine: 0,
        child_feminine: 0,
      }
    );
    setAgeGender([
      { group: "ADULT_MASCULINE", count: sums.adult_masculine },
      { group: "ADULT_FEMININE", count: sums.adult_feminine },
      { group: "CHILD_MASCULINE", count: sums.child_masculine },
      { group: "CHILD_FEMININE", count: sums.child_feminine },
    ]);
  }, [patients]);

  // 🎨 Chart color selection
  const barColorsMemo = useMemo(() => {
    const { getBarColors } = require("../utils/getBarColors"); // avoid circular
    return getBarColors(statsData);
  }, [statsData]);

  // 🔢 Change trend window (wired to InputNumber)
  const handleDaysCountChange = useCallback((e) => {
    const parsed = parseInt(e?.target?.value, 10);
    if (!isNaN(parsed) && parsed > 0) setDaysCount(parsed);
  }, []);

  // 📈 Build unified trend rows (Days Ago + Rolling Averages)
  const buildTrendRows = useCallback(() => {
    const byDay = new Map();

    (daysAgo || []).forEach((d) => {
      const key = d.day ?? d.date ?? d.timestamp;
      if (!key) return;
      if (!byDay.has(key)) byDay.set(key, { day: key });
      byDay.get(key).count = d.count ?? d.value ?? d.total ?? d.count;
    });

    (rollingAverages || []).forEach((d) => {
      const key = d.day ?? d.date ?? d.timestamp;
      if (!key) return;
      if (!byDay.has(key)) byDay.set(key, { day: key });
      byDay.get(key).rollingAvg = d.rollingAvg ?? d.avg ?? d.value;
    });

    return Array.from(byDay.values()).sort((a, b) =>
      String(a.day).localeCompare(String(b.day))
    );
  }, [daysAgo, rollingAverages]);

  return (
    <div>
      {/* Filters */}

      <Form form={form} layout="horizontal">
        {/* NEW centered row for the button */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          <Button type="primary" onClick={triggerEmail} loading={emailLoading}>
            {t("DAILY_EMAIL")}
          </Button>
        </div>
        <br /> <br />
        <hr></hr>
        <br />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Form.Item label={t("DATE_RANGE")} style={{ margin: 0 }}>
            <RangePicker
              format="DD-MMM-YYYY"
              value={pickerRange}
              onChange={(v) => handleDateChange(v, t)}
              locale={i18n.language === "es" ? es_ES : en_US}
              style={{ width: "50%" }}
            />
          </Form.Item>
        </div>
      </Form>

      <Divider />
      <h1 style={{ textAlign: "center" }}>
        {t("STATSFOR")} {formatDate(dateRange[0])} {t("TO")}{" "}
        {formatDate(dateRange[1])}
      </h1>
      <Divider />

      {/* ======================= CHARTS ======================= */}
      <StationBarChart
        data={statsData}
        colors={barColorsMemo}
        titleRenderer={() => renderLegendStations(1)}
      />
      <br />
      <br />
      <br />
      <br />
      <SatScoreChart
        data={satScore}
        colors={{
          1: "#d73027",
          2: "#fc8d59",
          3: "#fee08b",
          4: "#91bfdb",
          5: "#4575b4",
        }}
        titleRenderer={() => renderLegendStations(2)}
      />
      <br />
      <br />
      <br />
      <br />
      <ArrivalChart
        data={arrivalTimeData}
        t={t}
        titleRenderer={() => renderLegendStations(3)}
      />
      <br />
      <br />
      <br />
      <br />
      <WaitingTimeChart
        data={statsData.map((d) => ({
          ...d,
          range_avg_waiting_time: d.range_avg_waiting_time / 60000,
        }))}
        t={t}
        titleRenderer={() => renderLegendStations(4)}
      />
      <br />
      <br />
      <br />
      <br />
      <ProcedureTimeChart
        data={statsData.map((d) => ({
          ...d,
          range_avg_procedure_time: d.range_avg_procedure_time / 60000,
        }))}
        t={t}
        titleRenderer={() => renderLegendStations(7)}
      />
      <br />
      <br />
      <br />
      <br />
      <DemographicsChart
        data={ageGender.map((d) => ({ ...d, translatedGroup: t(d.group) }))}
        titleRenderer={() => renderLegendStations(5)}
      />
      <br />
      <br />
      <br />
      <br />
      <Form form={form} layout="horizontal">
        {/* NEW centered row for the button */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          <Form.Item
            name="daysCount"
            label={t("TRENDDAYS")}
            rules={[{ type: "number", min: 7, max: 365 }]}
            style={{ margin: 0 }}
          >
            <InputNumber
              min={7}
              max={365}
              step={1}
              style={{ width: 120 }}
              onBlur={() => {
                const val = form.getFieldValue("daysCount");
                if (val != null) {
                  handleDaysCountChange({ target: { value: val } });
                }
              }}
              onPressEnter={(e) => {
                e.preventDefault(); // prevent submit/reset
                const val = form.getFieldValue("daysCount");
                if (val != null) {
                  handleDaysCountChange({ target: { value: val } });
                }
              }}
            />
          </Form.Item>
        </div>
      </Form>

      <RollingAverageChart
        data={rollingAverages}
        t={t}
        goal={70}
        titleRenderer={() => renderLegendStations(6)}
      />
      {/* Trends export button near rolling average chart */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        <ExcelExport
          data={buildTrendRows()}
          reportName="EXPORT_TRENDS"
          fileName={`trends_last_${daysCount}_days.xlsx`}
        />
      </div>

      {/* ======================= TABLES ======================= */}
      <Divider />
      <h2 style={{ textAlign: "center" }}>
        {t("todaysComplete")} ({patients.length})
      </h2>

      {/* Patients export */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <ExcelExport
          data={patients.map((p) => ({
            pt_no: p.pt_no,
            patient_name: p.patient_name,
            age_group: p.age_group,
            gender: p.gender,
            type_of_visit: p.type_of_visit,
            services: p.servicesString,
          }))}
          reportName="EXPORT_PATIENTS"
          fileName={`patients_${formatDateForFile(
            dateRange[0]
          )}_to_${formatDateForFile(dateRange[1])}.xlsx`}
        />
      </div>

      <PatientsTable
        patients={patients}
        patientsByPtNo={new Map(patients.map((p) => [p.pt_no, p]))}
        onReadmit={() => setColumnChanger((c) => !c)}
        columns={patientsColumns}
      />

      <Divider />
      <h2 style={{ textAlign: "center" }}>
        {t("todaysSurveys")} ({surveys.length})
      </h2>

      {/* Surveys export */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <ExcelExport
          data={surveys.map((s) => ({
            satisfaction: s.satisfaction,
            prayer_request: s.prayer_request,
            gender: s.gender,
            age_group: s.age_group,
          }))}
          reportName="EXPORT_SURVEYS"
          fileName={`surveys_${formatDateForFile(
            dateRange[0]
          )}_to_${formatDateForFile(dateRange[1])}.xlsx`}
        />
      </div>

      <SurveysTable surveys={surveys} columns={surveyColumns} />
    </div>
  );
}
