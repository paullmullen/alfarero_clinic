/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
  Label,
  Line,
  ComposedChart,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  Divider,
  Input,
  Table,
  Row,
  Col,
  Image,
  Button,
  Form,
  DatePicker,
  Typography,
} from "antd";
import { firestore } from "./../helpers/firebaseConfig";
import dayjs from "dayjs";
import {
  Timestamp,
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { fetchSurveyData } from "../helpers/fetchSurveyData";
import { fetchPatientsData } from "../helpers/fetchPatientsData";
import { fetchWaitingTimeData } from "../helpers/fetchWaitingTimeData";
import { fetchDaysAgoData } from "../helpers/fetchDaysAgo";
import { satIcon } from "../helpers/satIcon";
import ExcelExport from "../helpers/Export";
import { handleReadmitClick } from "../helpers/updateStationStatus";
import es_ES from "antd/es/date-picker/locale/es_ES";
import en_US from "antd/es/date-picker/locale/en_US";
import enter from "../img/enter.png";
import CustomTick from "../helpers/CustomTick"; // define propiedades de ticks
import { getTodayAndTomorrowTimestamps } from "../helpers/dateHelpers";
// import { CatchingPokemonSharp } from "@mui/icons-material"; // <-- eliminar import no usado

const { RangePicker } = DatePicker;
const { Text } = Typography;

const datePickerLocales = {
  en: en_US,
  es: es_ES,
};

const Stats = () => {
  const [statsData, setStatsData] = useState([]);
  const [waitingData, setWaitingData] = useState([]); // (parece no usado; mantener si se usa en otra parte)
  const [arrivalTimeData, setArrivalTimeData] = useState([]);
  const [patients, setPatients] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [satScore, setSatScore] = useState([]);
  const [ageGender, setAgeGender] = useState([]);
  const [daysAgo, setDaysAgo] = useState({});
  const [rollingAverages, setRollingAverages] = useState([]);
  const [columnChanger, setColumnChanger] = useState(false);

  const { todayTimestamp, tomorrowTimestamp } = getTodayAndTomorrowTimestamps();
  const [dateRange, setDateRange] = useState([]);
  const [pickerRange, setPickerRange] = useState([
    dayjs(todayTimestamp.toDate()),
    dayjs(tomorrowTimestamp.toDate()),
  ]);

  const [daysCount, setDaysCount] = useState(60);

  const [t, i18n] = useTranslation("global");
  const [form] = Form.useForm();

  // --- Helpers y cálculos ---

  const calculateRollingAverage = (data, windowSize = 15) => {
    const rollingAverages = [];
    for (let i = 0; i < data.length; i++) {
      const windowData = data.slice(Math.max(0, i - windowSize + 1), i + 1);
      const average =
        windowData.reduce((sum, point) => sum + point.count, 0) /
        windowData.length;
      rollingAverages.push({
        date: data[i].date,
        count: data[i].count,
        average,
      });
    }
    return rollingAverages;
  };

  const handleDaysCountChange = (e) => {
    const value = e.target.value;
    const parsedValue = value === "" ? "" : parseInt(value, 10);
    if (value === "") {
      setDaysCount("");
      return;
    }
    if (!isNaN(parsedValue) && parsedValue > 0) {
      setDaysCount(parsedValue);
      getAgoData(parsedValue); // usar el parámetro
    }
  };

  const handleTableChange = (pagination, filters, sorter) => {
    // mantener registro del sorter si lo necesitas
    // setSortInfo(sorter);
  };

  const renderLegendStations = (which) => {
    switch (which) {
      case 1:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("patientsPerService")}</h2>
          </div>
        );
      case 2:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("satscores")}</h2>
          </div>
        );
      case 3:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("ARRIVAL_TIME")}</h2>
          </div>
        );
      case 4:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("WAITING_TIME")}</h2>
          </div>
        );
      case 5:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("DEMOGRAPHICS")}</h2>
          </div>
        );
      case 6:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>
              {t("LAST")} {daysCount} {t("DAYS")}
            </h2>
          </div>
        );
      case 7:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("PROCEDURE_TIME")}</h2>
          </div>
        );
      default:
        return null;
    }
  };

  const handleDateChange = (values) => {
    let startDate, endDate;
    // Normalizar
    if (values[0] instanceof Timestamp) {
      startDate = values[0].toDate();
      endDate = values[1].toDate();
    } else if (dayjs(values[0]).isValid()) {
      startDate = dayjs(values[0]).toDate();
      endDate = dayjs(values[1]).toDate();
    } else if (values[0] instanceof Date) {
      startDate = values[0];
      endDate = values[1];
    } else {
      console.error("Invalid date type");
      return;
    }
    // Redondear
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Limitar a 90 días
    const diffInMs = endDate - startDate;
    const maxRangeInMs = 90 * 24 * 60 * 60 * 1000;
    if (diffInMs > maxRangeInMs) {
      alert(t("ONLY90"));
      return;
    }

    // Actualizar estados
    const firestoreStart = Timestamp.fromDate(startDate);
    const firestoreEnd = Timestamp.fromDate(endDate);
    setDateRange([firestoreStart, firestoreEnd]);

    // Actualizar doc de rango (si es necesario para tu backend)
    const runAggregationRef = doc(firestore, "run_aggregation", "timestamp");
    updateDoc(runAggregationRef, {
      range_start: firestoreStart,
      range_end: firestoreEnd,
    });

    // Fijar RangePicker
    setPickerRange([dayjs(startDate), dayjs(endDate)]);
    // Ya NO togglear columnChanger aquí; el cambio de dateRange disparará el efecto
  };

  const surveyData = async () => {
    const data = await fetchSurveyData(dateRange);
    setSurveys(data);
    const satScore = await surveySummary(data);
    setSatScore(satScore);
  };

  const getAgoData = async (nDays = daysCount) => {
    const data = await fetchDaysAgoData(
      process.env.REACT_APP_FIREBASE_DB,
      nDays
    );
    setDaysAgo(data);
    if (data.length > 15) {
      setRollingAverages(calculateRollingAverage(data));
    } else {
      setRollingAverages([]);
    }
  };

  const surveySummary = async (surveys) => {
    const histogram = [0, 0, 0, 0, 0]; // índices 0..4 (vamos a usar 1..5 abajo)
    for (let i = 0; i < surveys.length; i++) {
      const score = surveys[i].satisfaction; // 1..5
      if (histogram[score]) {
        histogram[score]++;
      } else {
        histogram[score] = 1;
      }
    }
    return [
      { level: "1", count: histogram[1] },
      { level: "2", count: histogram[2] },
      { level: "3", count: histogram[3] },
      { level: "4", count: histogram[4] },
      { level: "5", count: histogram[5] },
    ];
  };

  const patientsData = async () => {
    const data = await fetchPatientsData(
      dateRange,
      process.env.REACT_APP_FIREBASE_DB,
      "both"
    );

    let hoursArray = new Array(24).fill(0);

    const processedPatients = data.map((s) => {
      const date = new Date(s.start_time);
      const hour = date.getHours();
      hoursArray[hour]++;

      return {
        ...s,
        station_type: t(s.station_type),
      };
    });

    const arrivalData = hoursArray.map((count, index) => ({
      hour: index,
      count,
    }));

    // Construir servicesString y totalWaitingTime
    const formattedPatients = processedPatients.map((patient) => ({
      ...patient,
      servicesString: Array.isArray(patient.plan_of_care)
        ? patient.plan_of_care
            .filter((s) => s.status !== "pending")
            .map((s) => s.station)
            .join(", ") || t("NO_SERVICE")
        : patient.complete
        ? t("NO_SERVICE")
        : "",
      totalWaitingTime: Array.isArray(patient.plan_of_care)
        ? patient.plan_of_care.reduce((total, station) => {
            if (station.waiting_start && station.waiting_end) {
              const timeDifference = Math.round(
                (station.waiting_end._seconds -
                  station.waiting_start._seconds) /
                  60
              );
              return total + timeDifference;
            } else {
              return total;
            }
          }, 0)
        : 0,
    }));

    setPatients(formattedPatients);
    setArrivalTimeData(arrivalData);
  };

  const setLastDaysRange = (days) => {
    const endDate = dayjs();
    const startDate = endDate.subtract(days, "day");
    form.setFieldsValue({ dateRange: [startDate, endDate] });
    handleDateChange([startDate, endDate]);
  };

  const stationsData = async () => {
    try {
      const statsCollection = await getDocs(collection(firestore, "stats"));
      const stats = statsCollection.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          count: data.count,
          range_count: data.range_count,
          adult_feminine: data.adult_feminine,
          range_adult_feminine: data.range_adult_feminine,
          adult_masculine: data.adult_masculine,
          range_adult_masculine: data.range_adult_masculine,
          child_feminine: data.child_feminine,
          range_child_feminine: data.range_child_feminine,
          child_masculine: data.child_masculine,
          range_child_masculine: data.range_child_masculine,
          avg_waiting_time: data.avg_waiting_time,
          range_avg_waiting_time: data.range_avg_waiting_time,
          avg_procedure_time: data.avg_procedure_time,
          range_avg_procedure_time: data.range_avg_procedure_time,
          station_type: data.station_type,
        };
      });
      setStatsData(stats);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const getBarColors = () => {
    const uniqueStationTypes = [
      ...new Set(statsData.map((entry) => entry.station_type)),
    ];
    const colors = [
      "#8884d8",
      "#82ca9d",
      "#ffc658",
      "#FFC0CB",
      "#22CC55",
      "#2255CC",
    ];
    const barColors = {};
    uniqueStationTypes.forEach((stationType, index) => {
      barColors[stationType] = colors[index % colors.length];
    });
    return barColors;
  };

  const fetchTimestamps = async () => {
    try {
      const docRef = doc(firestore, "run_aggregation", "timestamp");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDateRange([data.range_start, data.range_end]);
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.error("Error fetching timestamps:", error);
    }
  };

  // --- Memo: colores y transformaciones ---
  const barColors = useMemo(() => getBarColors(), [statsData]);

  const waitingStatsInMinutes = useMemo(
    () =>
      statsData.map((d) => ({
        ...d,
        range_avg_waiting_time: d.range_avg_waiting_time / 60000,
      })),
    [statsData]
  );

  const procedureStatsInMinutes = useMemo(
    () =>
      statsData.map((d) => ({
        ...d,
        range_avg_procedure_time: d.range_avg_procedure_time / 60000,
      })),
    [statsData]
  );

  const satColors = useMemo(
    () => ({
      1: "#d73027",
      2: "#fc8d59",
      3: "#fee08b",
      4: "#91bfdb",
      5: "#4575b4",
    }),
    []
  );

  // Efecto principal: primero rango, luego cargas paralelas
  useEffect(() => {
    const load = async () => {
      await fetchTimestamps();
      await Promise.all([
        patientsData(),
        stationsData(),
        surveyData(),
        getAgoData(60),
      ]);
    };
    load();
  }, [columnChanger, dateRange]);

  // Demografía: depende de pacientes
  useEffect(() => {
    const sums = patients.reduce(
      (acc, patient) => {
        acc.adult_masculine +=
          patient.gender === "masculine" && patient.age_group === "adult"
            ? 1
            : 0;
        acc.adult_feminine +=
          patient.gender === "feminine" && patient.age_group === "adult"
            ? 1
            : 0;
        acc.child_masculine +=
          patient.gender === "masculine" && patient.age_group === "child"
            ? 1
            : 0;
        acc.child_feminine +=
          patient.gender === "feminine" && patient.age_group === "child"
            ? 1
            : 0;
        return acc;
      },
      {
        adult_masculine: 0,
        adult_feminine: 0,
        child_masculine: 0,
        child_feminine: 0,
      }
    );
    const formattedData = [
      { group: "ADULT_MASCULINE", count: sums.adult_masculine },
      { group: "ADULT_FEMININE", count: sums.adult_feminine },
      { group: "CHILD_MASCULINE", count: sums.child_masculine },
      { group: "CHILD_FEMININE", count: sums.child_feminine },
    ];
    setAgeGender(formattedData);
  }, [patients]);

  // Memo: acceso O(1) por pt_no y handler estable
  const patientsByPtNo = useMemo(() => {
    const m = new Map();
    for (const p of patients) m.set(p.pt_no, p);
    return m;
  }, [patients]);

  const onReadmit = useCallback((ptNo) => {
    handleReadmitClick(ptNo);
    setColumnChanger((c) => !c);
  }, []);

  // Columnas memoizadas
  const patientsColumns = useMemo(
    () => [
      {
        title: t("patient"),
        dataIndex: "patient_name",
        key: "patient_name",
        width: 50,
        fixed: "left",
        sorter: (a, b) => a.patient_name.localeCompare(b.patient_name),
        render: (name) => <div>{name}</div>,
      },
      {
        title: t("age"),
        dataIndex: "age_group",
        key: "age_group",
        width: 25,
        fixed: "left",
        sorter: (a, b) => a.age_group.localeCompare(b.age_group),
        render: (name) => <div>{t(name)}</div>,
      },
      {
        title: t("gender"),
        dataIndex: "gender",
        key: "gender",
        width: 30,
        fixed: "left",
        sorter: (a, b) => a.gender.localeCompare(b.gender),
        render: (name) => <div>{t(name)}</div>,
      },
      {
        title: t("type_of_visit"),
        dataIndex: "type_of_visit",
        key: "type",
        width: 50,
        fixed: "left",
        sorter: (a, b) => a.type_of_visit.localeCompare(b.type_of_visit),
        render: (type) => <div>{t(type)}</div>,
      },
      {
        title: t("TOTALWAIT"),
        dataIndex: "totalWaitingTime",
        key: "totalWaitingTime",
        width: 25,
        fixed: "left",
        render: (total) => <div>{t(total)} min</div>,
      },
      {
        title: t("start_time"),
        dataIndex: "start_time",
        key: "start_time",
        width: 30,
        fixed: "left",
        defaultSortOrder: "ascend",
        sorter: (a, b) => a.start_time.localeCompare(b.start_time),
        render: (start_time) =>
          start_time
            ? new Date(start_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "",
      },
      {
        title: t("services"),
        dataIndex: "servicesString",
        key: "servicesString",
        width: 50,
        fixed: "left",
        wordWrap: true,
        render: (servicesString) => <div>{servicesString}</div>,
      },
      {
        title: t("READMIT"),
        dataIndex: "pt_no",
        key: "estado",
        width: 10,
        fixed: "left",
        render: (ptNo) => {
          const patient = patientsByPtNo.get(ptNo);
          const isDisabled = !patient?.complete;
          return (
            <Button
              type="text"
              hidden={isDisabled}
              onClick={() => onReadmit(ptNo)}
              style={{ padding: 0 }}
            >
              <Image src={enter} width={20} height={20} preview={false} />
            </Button>
          );
        },
      },
    ],
    [patientsByPtNo, onReadmit, i18n.language, t]
  );

  const surveyColumns = useMemo(
    () => [
      {
        title: t("sat"),
        dataIndex: "satisfaction",
        key: "satisfaction",
        width: 50,
        fixed: "left",
        render: (name) => <div>{satIcon(name)}</div>,
      },
      {
        title: t("prayer_request"),
        dataIndex: "prayer_request",
        key: "prayer_request",
        width: 250,
        fixed: "left",
        render: (name) => <div>{name}</div>,
      },
      {
        title: t("gender"),
        dataIndex: "gender",
        key: "gender",
        width: 50,
        fixed: "left",
        render: (name) => <div>{t(name)}</div>,
      },
      {
        title: t("age"),
        dataIndex: "age_group",
        key: "age_group",
        width: 50,
        fixed: "left",
        render: (name) => <div>{t(name)}</div>,
      },
    ],
    [i18n.language, t]
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return "Loading...";
    const locale = i18n.language;
    return timestamp.toDate().toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // --- Render ---
  return (
    <div>
      {/* Segmento 1: filtros y resumen */}
      <Form form={form} layout="vertical">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Form.Item
            name="dateRange"
            label={t("DATE_RANGE")}
            style={{ margin: 0 }}
          >
            <RangePicker
              format="DD-MMM-YYYY"
              value={pickerRange}
              locale={
                i18n.language === "es"
                  ? datePickerLocales.es
                  : datePickerLocales.en
              }
              onChange={handleDateChange}
              style={{ width: "50%" }}
            />
          </Form.Item>

          <Button
            onClick={() => setLastDaysRange(30)}
            style={{ whiteSpace: "nowrap" }}
          >
            {t("LAST_30_DAYS")}
          </Button>
          <Button
            onClick={() => setLastDaysRange(60)}
            style={{ whiteSpace: "nowrap" }}
          >
            {t("LAST_60_DAYS")}
          </Button>
          <Button
            onClick={() => setLastDaysRange(0)}
            style={{ whiteSpace: "nowrap" }}
          >
            {t("TODAY")}
          </Button>
        </div>
      </Form>

      <Divider />

      <Row>
        <Col span={24} type="flex" align="middle">
          <h1>
            {t("STATSFOR")} {formatDate(dateRange[0])} {t("TO")}{" "}
            {formatDate(dateRange[1])}
          </h1>
          <Divider />
        </Col>
      </Row>

      <div className="stats-container">
        <div className="charts-container">
          <div style={{ display: "flex", width: "100%", height: "100%" }}>
            {/* station count */}
            <ResponsiveContainer width="50%" height="100%" minHeight="300px">
              <BarChart data={statsData} label="station">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="station_type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend content={() => renderLegendStations(1)} />
                <Bar dataKey="range_count">
                  {statsData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={barColors[entry.station_type]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* sat score */}
            <ResponsiveContainer width="50%" height="100%" minHeight="300px">
              {satScore.length > 0 ? (
                <BarChart data={satScore}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" tick={<CustomTick />} />
                  <YAxis dataKey="count" allowDecimals={false} />
                  <Tooltip />
                  <Legend content={() => renderLegendStations(2)} />
                  <Bar dataKey="count">
                    {satScore.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={satColors[Number(entry.level)]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <div>Loading...</div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* arrival time */}
        <div className="charts-container">
          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            <BarChart data={arrivalTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis allowDecimals={false}>
                <Label value={t("NUM_PTS")} angle="-90" />
              </YAxis>
              <Tooltip />
              <Legend content={() => renderLegendStations(3)} />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>{t("PRE_MARCH_MESSAGE")}</div>

        {/* avg waiting time */}
        <div className="charts-container">
          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            <BarChart data={waitingStatsInMinutes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="station_type" />
              <YAxis allowDecimals={false}>
                <Label value={t("MINUTES")} angle="-90" />
              </YAxis>
              <Tooltip />
              <Legend content={() => renderLegendStations(4)} />
              <Bar dataKey="range_avg_waiting_time" fill="#22CC55" />
            </BarChart>
          </ResponsiveContainer>

          {/* avg procedure time */}
          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            <BarChart data={procedureStatsInMinutes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="station_type" />
              <YAxis allowDecimals={false}>
                <Label value={t("MINUTES")} angle="-90" />
              </YAxis>
              <Tooltip />
              <Legend content={() => renderLegendStations(7)} />
              <Bar dataKey="range_avg_procedure_time" fill="#2255CC" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* demographics */}
        <div className="charts-container">
          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            <BarChart
              data={ageGender.map((d) => ({
                ...d,
                translatedGroup: t(d.group),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="translatedGroup" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend content={() => renderLegendStations(5)} />
              <Bar dataKey="count">
                {ageGender.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.group.includes("FEMININE") ? "#FF69B4" : "#1E90FF"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* total patients trend */}
          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            <ComposedChart data={rollingAverages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis>
                <Label value={t("COUNT")} angle="-90" />
              </YAxis>
              <Tooltip />
              <Legend content={() => renderLegendStations(6)} />
              <ReferenceLine y={70} stroke="red" label={t("GOAL")} />
              <Bar dataKey="count" fill="#2255CC" />
              <Line
                type="monotone"
                dataKey="average"
                stroke="cyan"
                strokeWidth={4}
                dot={false}
                connectNulls={true}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Row>
        <Col span={12}></Col>
        <Col span={12} alignItems={"center"} type="flex" align="middle">
          <Text strong>{t("TRENDDAYS")} </Text>
          <Input
            id="daysInput"
            type="number"
            value={daysCount}
            onChange={(e) => setDaysCount(e.target.value)}
            onBlur={handleDaysCountChange}
            onPressEnter={handleDaysCountChange}
            min="0"
            style={{ width: "60px" }}
          />
        </Col>
      </Row>

      <Divider />

      {/* Segmento 2: descargas */}
      <Row>
        <Col span={24} type="flex" align="middle">
          <br />
          <br />
          <h2>{t("DOWNLOAD")}</h2>
          <ExcelExport data={patients} reportName="TODAYSPATIENTS" />
          <ExcelExport data={surveys} reportName="todaysSurveys" />
          <ExcelExport data={daysAgo} reportName="DAYSAGO" />
          <br />
          <br />
          <br />
        </Col>
      </Row>

      <Divider />

      {/* Segmento 3: tablas */}
      <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
        {t("todaysComplete")} ({patients.length})
      </h2>
      <Table
        rowKey={"pt_no"}
        columns={patientsColumns}
        dataSource={patients.some((d) => d === undefined) ? [] : patients}
        scroll={{ x: 410, y: 800 }}
        sticky
        pagination={{ pageSize: 50 }}
        onChange={handleTableChange}
      />

      <Divider />

      <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
        {t("todaysSurveys")} ({surveys.length})
      </h2>
      <Table
        rowKey={"inx"}
        columns={surveyColumns}
        dataSource={surveys.some((d) => d === undefined) ? [] : surveys}
        scroll={{ x: 580, y: 800 }}
        sticky
        pagination={{ pageSize: 50 }}
      />
    </div>
  );
};

export default Stats;
