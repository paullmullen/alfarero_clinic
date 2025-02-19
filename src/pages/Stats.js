/* eslint-disable no-unused-vars */

import React, { useEffect, useState } from "react";
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
import CustomTick from "../helpers/CustomTick"; //defines the bar chart properties
import { getTodayAndTomorrowTimestamps } from "../helpers/dateHelpers";

const { RangePicker } = DatePicker;
const { Text } = Typography;
const datePickerLocales = {
  en: en_US, // Use the locale object for English
  es: es_ES, // Use the locale object for Spanish
};

const Stats = () => {
  const [statsData, setStatsData] = useState([]);
  const [waitingData, setWaitingData] = useState([]);
  const [arrivalTimeData, setArrivalTimeData] = useState([]);
  const [patients, setPatients] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [satScore, setSatScore] = useState([]);
  const [ageGender, setAgeGender] = useState([]);
  const [daysAgo, setDaysAgo] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [rollingAverages, setRollingAverages] = useState([]);
  const [columnChanger, setColumnChanger] = useState(false); //toggling column changer triggers useEffect.  Can update columnChanger when the reenter button is clicked.

  const { todayTimestamp, tomorrowTimestamp } = getTodayAndTomorrowTimestamps();
  const [dateRange, setDateRange] = useState([]);
  const [pickerRange, setPickerRange] = useState([
    todayTimestamp.toDate(),
    tomorrowTimestamp.toDate(),
  ]);

  const [daysCount, setDaysCount] = useState(60);

  const calculateRollingAverage = (data, windowSize = 15) => {
    const rollingAverages = [];
    for (let i = 0; i < data.length; i++) {
      const windowData = data.slice(Math.max(0, i - windowSize + 1), i + 1);
      const average =
        windowData.reduce((sum, point) => sum + point.count, 0) /
        windowData.length;
      rollingAverages.push({ date: data[i].date, average });
    }
    return rollingAverages;
  };

  const handleDaysCountChange = (e) => {
    const value = e.target.value;
    const parsedValue = value === "" ? "" : parseInt(value, 10);

    if (value === "") {
      setDaysCount("");
      return; // Skip fetching data if the input is cleared
    }

    if (!isNaN(parsedValue) && parsedValue > 0) {
      setDaysCount(parsedValue);
      getAgoData(parsedValue); // Fetch data with the new valid integer value
    }
  };

  // State to keep track of sorting
  const [sortInfo, setSortInfo] = useState({});

  // Handle table sorting changes
  const handleTableChange = (pagination, filters, sorter) => {
    setSortInfo(sorter);
  };

  const [t, i18n] = useTranslation("global");

  const renderLegendStations = (props) => {
    switch (props) {
      case 1:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("patientsPerService")}</h2>;
          </div>
        );
      case 2:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("satscores")}</h2>;
          </div>
        );
      case 3:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("ARRIVAL_TIME")}</h2>;
          </div>
        );
      case 4:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("WAITING_TIME")}</h2>;
          </div>
        );
      case 5:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("DEMOGRAPHICS")}</h2>;
          </div>
        );
      case 6:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>
              {t("LAST")} {daysCount} {t("DAYS")}
            </h2>
            ;
          </div>
        );
      case 7:
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{t("PROCEDURE_TIME")}</h2>;
          </div>
        );
      default:
        return null; // Return null instead of an empty string
    }
  };

  const [form] = Form.useForm();

  const handleDateChange = (values) => {
    let startDate, endDate;

    // Check the type of values[0] and values[1]
    if (values[0] instanceof Timestamp) {
      // Firestore Timestamp
      startDate = values[0].toDate(); // Convert Firestore Timestamp to JavaScript Date
      endDate = values[1].toDate();
    } else if (dayjs(values[0]).isValid()) {
      // dayjs object
      startDate = dayjs(values[0]).toDate(); // Convert dayjs to JavaScript Date
      endDate = dayjs(values[1]).toDate();
    } else if (values[0] instanceof Date) {
      // JavaScript Date object
      startDate = values[0];
      endDate = values[1];
    } else {
      console.error("Invalid date type");
      return; // Exit early if the date type is unrecognized
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 23, 59, 99);
    // Log to see the values after conversion

    // Store Firestore Timestamp
    setDateRange([
      Timestamp.fromDate(startDate), // Start of the selected day as a Firestore Timestamp
      Timestamp.fromDate(endDate), // End of the selected day as a Firestore Timestamp
    ]);

    const runAggregationRef = doc(firestore, "run_aggregation", "timestamp");
    updateDoc(runAggregationRef, {
      range_start: Timestamp.fromDate(startDate),
      range_end: Timestamp.fromDate(endDate),
    });

    setColumnChanger(!columnChanger);

    // Set the picker range as dayjs objects (for displaying in the picker)
    setPickerRange(dayjs(startDate), dayjs(endDate));
  };

  const surveyData = async () => {
    const data = await fetchSurveyData(dateRange);
    setSurveys(data);
    const satScore = await surveySummary(data);
    setSatScore(satScore);
  };

  const getAgoData = async () => {
    const data = await fetchDaysAgoData(daysCount);
    setDaysAgo(data);
    if (data.length > 15) {
      setRollingAverages(calculateRollingAverage(data));
    } else {
      setRollingAverages([]);
    }
  };

  const surveySummary = async (surveys) => {
    const histogram = [0, 0, 0, 0, 0]; //sat score count.  histogram[1] is score = 1, etc.
    for (let i = 0; i < surveys.length; i++) {
      const score = surveys[i].satisfaction;
      if (histogram[score]) {
        histogram[score]++;
      } else {
        histogram[score] = 1;
      }
    }

    const satScore = [
      { level: "1", count: histogram[1] },
      { level: "2", count: histogram[2] },
      { level: "3", count: histogram[3] },
      { level: "4", count: histogram[4] },
      { level: "5", count: histogram[5] },
    ];
    return satScore;
  };

  const patientsData = async () => {
    const data = await fetchPatientsData(
      dateRange,
      process.env.REACT_APP_FIREBASE_DB,
      "both"
    );
    let hoursArray = new Array(24).fill(0);

    const processedPatients = data.map((s) => {
      // Increment the hour count directly while mapping
      const date = new Date(s.start_time);
      const hour = date.getHours(s.start_time);
      hoursArray[hour]++;

      return {
        ...s,
        station_type: t(s.station_type),
      };
    });

    // Convert to histogram format
    const arrivalData = hoursArray.map((count, index) => ({
      hour: index,
      count,
    }));

    // this adds a string that contcatenates all used services into a string for use later in the completed patients table.
    const formattedPatients = processedPatients.map((patient) => ({
      ...patient, // Spread existing patient data
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
            // Check if both waiting_start and waiting_end exist
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
        : 0, // Default to 0 if `plan_of_care` isn't an array
    }));
    setPatients(formattedPatients);
    setArrivalTimeData(arrivalData);
  };

  const stationsData = async () => {
    try {
      const statsCollection = await getDocs(collection(firestore, "stats"));
      const stats = statsCollection.docs.map((doc) => {
        const data = doc.data();
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
      console.log(stats);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const getBarColors = () => {
    const uniqueStationTypes = [
      ...new Set(statsData.map((entry) => entry.station_type)),
    ];
    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#FFC0CB"]; // Definir una lista de colores
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

  fetchTimestamps();

  useEffect(() => {
    const doStuffInOrder = async () => {
      await fetchTimestamps();
      await patientsData();
      await stationsData();
      await surveyData();
      await getAgoData(60);
    };
    doStuffInOrder();
  }, [columnChanger]);

  // update the demographics data when the stats data changes.

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
  }, [statsData]);

  const barColors = getBarColors();

  const patientsColumns = [
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
    // {
    //   title: t("reason_for_visit"),
    //   dataIndex: "reason_for_visit",
    //   key: "reason",
    //   width: 120,
    //   fixed: "left",
    //   render: (reason) => <div>{reason}</div>,
    // },
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
              hour12: true, // 24-hour format
            })
          : "", // If no start_time, return an empty string
    },
    {
      title: t("services"),
      dataIndex: "servicesString",
      key: "servicesString",
      // Adjust the width for the services column as needed.
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
        const patient = patients.find((item) => item.pt_no === ptNo);
        let isDisabled = patient ? !patient.complete : false;
        return (
          <Button
            type="text"
            hidden={isDisabled}
            onClick={() => {
              handleReadmitClick(ptNo);
              setColumnChanger(!columnChanger);
            }}
            style={{ padding: 0 }}
          >
            <Image src={enter} width={20} height={20} preview={false} />
          </Button>
        );
      },
    },
  ];

  const surveyColumns = [
    // {
    //   title: t("source"),
    //   dataIndex: "source",
    //   key: "source",
    //   width: 50,
    //   fixed: "left",
    //   render: (name) => <div>{t(name)}</div>,
    // },
    {
      title: t("sat"),
      dataIndex: "satisfaction",
      key: "satisfaction",
      width: 50,
      fixed: "left",
      render: (name) => <div>{satIcon(name)}</div>,
    },
    // {
    //   title: t("first"),
    //   dataIndex: "first",
    //   key: "first",
    //   width: 25,
    //   fixed: "left",
    //   render: (name) => <div>{name === "1" ? t("yes") : t("no")}</div>,
    // },
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
  ];

  const formatDate = (timestamp) => {
    if (!timestamp) return "Loading...";

    const locale = i18n.language; // get the current language from i18n

    return timestamp.toDate().toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  // Renders the visible screen

  return (
    <div>
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
            />
          </Form.Item>
        </div>
      </Form>

      <Divider></Divider>
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
            {/* station count graph */}

            <ResponsiveContainer width="50%" height="100%" minHeight="300px">
              <BarChart data={statsData} label="station">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="station_type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend content={() => renderLegendStations(1)} />

                <Bar dataKey="range_count">
                  {statsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* sat score graph */}

            <ResponsiveContainer width="50%" height="100%" minHeight="300px">
              {satScore.length > 0 ? (
                <BarChart data={satScore}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" tick={<CustomTick />} />
                  <YAxis dataKey="count" allowDecimals={false} />
                  <Tooltip />
                  <Legend content={() => renderLegendStations(2)} />

                  <Bar dataKey="count">
                    {surveys.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={barColors[entry.level]}
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

        {/* arrival time graph */}

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

        {/* average waiting time graph */}
        <div className="charts-container">
          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            <BarChart
              data={statsData.map((d) => ({
                ...d,
                range_avg_waiting_time: d.range_avg_waiting_time / 60000,
              }))}
            >
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

          {/* average procedure time graph */}

          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            <BarChart
              data={statsData.map((d) => ({
                ...d,
                range_avg_procedure_time: d.range_avg_procedure_time / 60000,
              }))}
            >
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

        {/* demographics graph */}

        <div className="charts-container">
          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            <BarChart
              data={ageGender.map((d) => ({
                ...d,
                translatedGroup: t(d.group),
              }))} // Translate group names
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
              </Bar>{" "}
            </BarChart>
          </ResponsiveContainer>

          {/* total patients trend */}
          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            {/* Bar chart for total patients trend */}
            <BarChart data={daysAgo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis>
                <Label value={t("COUNT")} angle="-90" />
              </YAxis>
              <Tooltip />
              <Legend content={() => renderLegendStations(6)} />
              <Bar dataKey="count" fill="#2255CC" />
              <ReferenceLine y={70} stroke="red" label={t("GOAL")} />
            </BarChart>
          </ResponsiveContainer>

          {/* TODO:  Add the 15-day rolling average line to this chart */}
        </div>
      </div>
      <Row>
        <Col span={12}>&nbsp;</Col>
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
            style={{ width: "50px" }}
          />
        </Col>
      </Row>
      <Divider />
      <Row>
        <Col span={24} type="flex" align="middle">
          <br></br>
          <br></br>
          <h2>{t("DOWNLOAD")}</h2>
          <ExcelExport data={patients} reportName="TODAYSPATIENTS" />
          &nbsp;
          <ExcelExport data={surveys} reportName="todaysSurveys" />
          &nbsp;
          <ExcelExport data={daysAgo} reportName="DAYSAGO" />
          <br></br>
          <br></br>
          <br></br>
        </Col>
      </Row>
      <Divider />
      <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
        {t("todaysComplete")} ({patients.length})
      </h2>
      <Table
        rowKey={"pt_no"}
        columns={patientsColumns}
        dataSource={patients.some((d) => d === undefined) ? [] : patients}
        scroll={{ x: 410, y: 1500 }}
        sticky
        pagination={true}
        offsetScroll={3}
        onChange={handleTableChange} // Attach the handleTableChange function
        {...sortInfo} // Spread the sortInfo to apply sorting
      />
      <Divider></Divider>
      <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
        {t("todaysSurveys")} ({surveys.length})
      </h2>
      <Table
        rowKey={"inx"}
        columns={surveyColumns}
        dataSource={surveys.some((d) => d === undefined) ? [] : surveys}
        scroll={{ x: 580, y: 1500 }}
        sticky
        pagination={true}
        offsetScroll={3}
      />
    </div>
  );
};

export default Stats;
