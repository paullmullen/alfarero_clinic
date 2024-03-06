import React, { useEffect, useState } from "react";
import { firestore } from "./../helpers/firebaseConfig";
import {
  BarChart, 
  Bar,
  XAxis,  YAxis,  
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
  Label,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  Divider,
  Table,
  Row,
  Col,
  Image,
  Button,
  Form,
  DatePicker,
} from "antd";


import "firebase/compat/firestore";
import { stations } from "../helpers/stations";
import { fetchSurveyData } from "../helpers/fetchSurveyData";
import { fetchPatientsData } from "../helpers/fetchPatientsData";
import { fetchWaitingTimeData } from "../helpers/fetchWaitingTimeData";
import { satIcon } from "../helpers/satIcon";
import ExcelExport from "../helpers/Export";
import { handleReadmitClick } from "../helpers/updateStationStatus";
import es_ES from "antd/es/date-picker/locale/es_ES";
import en_US from "antd/es/date-picker/locale/en_US";
import enter from "../img/enter.png";

const { RangePicker } = DatePicker;
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
  const [columnChanger, setColumnChanger] = useState(false); //toggling column changer triggers useEffect.  Can update columnChanger when the reenter button is clicked.
  const [dateRange, setDateRange] = useState([
    new Date().setHours(0, 0, 0, 0),
    new Date().setHours(23, 59, 59, 999),
  ]);

  
  // State to keep track of sorting
  const [sortInfo, setSortInfo] = useState({});

  // Handle table sorting changes
  const handleTableChange = (pagination, filters, sorter) => {
    setSortInfo(sorter);
  };

  const [t, i18n] = useTranslation("global");

  const howManyToday = async (stationName) => {
    try {
      const query = firestore
        .collection("patients")
        .where("start_time", ">=", new Date(dateRange[0]))
        .where("start_time", "<=", new Date(dateRange[1]));

      const querySnapshot = await query.get();

      let count = 0;
      let adultMasculine = 0;
      let adultFeminine = 0;
      let childMasculine = 0;
      let childFeminine = 0;
      querySnapshot.forEach((doc) => {
        const patient = doc.data();
        patient.plan_of_care.forEach((s) => {
          count += s.station === stationName && s.status !== "pending" ? 1 : 0;
        });
        if (patient.gender == "masculine" && patient.age_group == "adult") {
          adultMasculine++;
        }
        if (patient.gender == "feminine" && patient.age_group == "adult") {
          adultFeminine++;
        }
        if (patient.gender == "masculine" && patient.age_group == "child") {
          childMasculine++;
        }
        if (patient.gender == "feminine" && patient.age_group == "child") {
          childFeminine++;
        }
      });
      setAgeGender([
        { name: t("ADULT_FEMININE"), value: adultFeminine, fill: "#de7ad1" },
        { name: t("ADULT_MASCULINE"), value: adultMasculine, fill: "#7a98de"  },
        { name: t("CHILD_FEMININE"), value: childFeminine, fill: "#de7ad1"  },
        { name: t("CHILD_MASCULINE"), value: childMasculine, fill: "#7a98de"  },
      ]);
      

      return count;
    } catch (e) {
      console.error("Error fetching patient count:", e);
    }
  };

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
      default:
        return null; // Return null instead of an empty string
    }
  };

  const [form] = Form.useForm();
  // Set default start date and end date to the current date

  const onDateChange = (values) => {
    if (values) {
      setDateRange([
        values[0]._d.setHours(0, 0, 0, 0),
        values[1]._d.setHours(23, 59, 59, 999),
      ]);
    } else {
      const midnightToday = new Date();
      const tonightToday = new Date();

      midnightToday.setHours(0, 0, 0, 0);
      tonightToday.setHours(23, 59, 59, 999);

      setDateRange([new Date(midnightToday), new Date(tonightToday)]);
    }
  };

  const surveyData = async () => {
    const data = await fetchSurveyData(dateRange);
    setSurveys(data);
    const satScore = await surveySummary(data);
    setSatScore(satScore);
  };

  const getWaitingData = async () => {
    const data = await fetchWaitingTimeData(dateRange);
    setWaitingData(data);
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
    const data = await fetchPatientsData(dateRange);
    const patientsData = data.map((s) => {
      return {
        ...s,
        station_type: t(s.station_type),
      };
    });

    let hoursArray = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    patientsData.forEach((patient) => {
      hoursArray[parseInt(patient.start_time.substring(0, 2))]++;
    });
    const arrivalData = hoursArray.map((count, index) => ({
      hour: index,
      count: count,
    }));

    setPatients(patientsData);
    setArrivalTimeData(arrivalData);
  };

  const stationsData = async () => {
    try {
      let stats = [];

      // Create an array of Promises for each station
      const promises = stations.map(async (s) => {
        const count = await howManyToday(s.value);
        return { station: s.value, count };
      });

      // Wait for all promises to resolve using Promise.all()
      stats = await Promise.all(promises);
      stats = stats.filter((f) => f.station !== "reg");

      setStatsData(stats);
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

  const CustomTick = (props) => {
    // eslint-disable-next-line react/prop-types
    const { x, y, payload } = props;
    // eslint-disable-next-line react/prop-types
    switch (payload.value) {
      case "1":
        return (
          <svg
            x={x - 15}
            y={y}
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="36"
              cy="33.4"
              r="31.4"
              stroke="#ED1C24"
              strokeWidth="3"
            />
            <line
              x1="17.9"
              y1="16.6"
              x2="33.8"
              y2="26.8"
              stroke="#ED1C24"
              strokeWidth="3"
            />
            <line
              x1="55.1"
              y1="16.6"
              x2="39.3"
              y2="26.8"
              stroke="#ED1C24"
              strokeWidth="3"
            />
            <circle
              cx="23"
              cy="33.4"
              r="5.1"
              stroke="#ED1C24"
              strokeWidth="3"
            />
            <circle
              cx="50.3"
              cy="33.4"
              r="5.1"
              stroke="#ED1C24"
              strokeWidth="3"
            />
            <path
              d="M36,54.1l-11.5-0.2c0.1-6.2,5.3-11.3,11.5-11.3c6.3,0,11.5,5.2,11.5,11.5H36z"
              stroke="#ED1C24"
              strokeWidth="3"
            />
          </svg>
        );
      case "2":
        return (
          <svg
            x={x - 15}
            y={y}
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="36"
              cy="33.4"
              r="31.4"
              stroke="#F7941D"
              strokeWidth="3"
            />
            <circle
              cx="23"
              cy="27.4"
              r="5.1"
              stroke="#F7941D"
              strokeWidth="3"
            />
            <circle
              cx="50.3"
              cy="27.4"
              r="5.1"
              stroke="#F7941D"
              strokeWidth="3"
            />
            <path
              d="M24.9,53.2v0.7c0.1-6.2,5.3-11.3,11.5-11.3c6.3,0,11.5,5.2,11.5,11.5"
              stroke="#F7941D"
              strokeWidth="3"
            />
          </svg>
        );
      case "3":
        return (
          <svg
            x={x - 15}
            y={y}
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="36"
              cy="33.4"
              r="31.4"
              stroke="#2E3192"
              strokeWidth="3"
            />
            <circle
              cx="23"
              cy="27.4"
              r="5.1"
              stroke="#2E3192"
              strokeWidth="3"
            />
            <circle
              cx="50.3"
              cy="27.4"
              r="5.1"
              stroke="#2E3192"
              strokeWidth="3"
            />
            <line
              x1="19.5"
              y1="50.5"
              x2="52.9"
              y2="42.8"
              stroke="#2E3192"
              strokeWidth="3"
            />
          </svg>
        );
      case "4":
        return (
          <svg
            x={x - 15}
            y={y}
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="36"
              cy="33.4"
              r="31.4"
              stroke="#22DD22"
              strokeWidth="3"
            />
            <circle
              cx="23"
              cy="27.4"
              r="5.1"
              stroke="#22DD22"
              strokeWidth="3"
            />
            <circle
              cx="50.3"
              cy="27.4"
              r="5.1"
              stroke="#22DD22"
              strokeWidth="3"
            />
            <path
              d="M52.4,43.6v-0.4c-0.1,5-7.6,9-16.6,9c-9.1,0-16.6-4.1-16.6-9.2"
              stroke="#22DD22"
              strokeWidth="3"
            />
          </svg>
        );
      case "5":
        return (
          <svg
            x={x - 15}
            y={y}
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="36"
              cy="33.4"
              r="31.4"
              stroke="#009444"
              strokeWidth="3"
            />
            <circle
              cx="22.3"
              cy="22.3"
              r="5.1"
              stroke="#009444"
              strokeWidth="3"
            />
            <circle
              cx="49.6"
              cy="22.3"
              r="5.1"
              stroke="#009444"
              strokeWidth="3"
            />
            <path
              d="M58.2,32.6v-1C58,43.9,48,53.9,36,53.9c-12.2,0-22.2-10.3-22.2-22.7"
              stroke="#009444"
              strokeWidth="3"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const doStuffInOrder = async () => {
      await patientsData();
      await stationsData();
      await surveyData();
      await getWaitingData();
    };
    doStuffInOrder();
  }, [t, columnChanger, dateRange]);

  const barColors = getBarColors();
  const waitTimeChartData = waitingData;

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
      width: 50,
      fixed: "left",
      sorter: (a, b) => a.age_group.localeCompare(b.age_group),
      render: (name) => <div>{name}</div>,
    },
    {
      title: t("gender"),
      dataIndex: "gender",
      key: "gender",
      width: 50,
      fixed: "left",
      sorter: (a, b) => a.gender.localeCompare(b.gender),
      render: (name) => <div>{name}</div>,
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
      dataIndex: "total_wait",
      key: "type",
      width: 50,
      fixed: "left",
      render: (total) => <div>{t(total)} min</div>,
    },
    {
      title: t("start_time"),
      dataIndex: "start_time",
      key: "start_time",
      width: 50,
      fixed: "left",
      defaultSortOrder: "ascend",
      sorter: (a, b) => a.start_time.localeCompare(b.start_time),
      render: (time) => <div>{time}</div>,
    },
    {
      title: t("services"),
      dataIndex: "plan_of_care",
      key: "poc",
      // Adjust the width for the services column as needed.
      width: 250,
      fixed: "left",
      wordWrap: true,
      render: (services, patient) => (
        <div>
          {services === "" && patient.complete === true
            ? t("NO_SERVICE")
            : services}
        </div>
      ),
    },
    {
      title: t("READMIT"),
      dataIndex: "pt_no",
      key: "estado",
      width: 10,
      fixed: "right",
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

  // Renders the visible screen

  return (
    <div>
      <Form form={form} layout="vertical">
        <Form.Item
          name="dateRange"
          label={t("DATE_RANGE")}
          rules={[
            {
              required: false,
              message: "Please select a date range",
            },
          ]}
        >
          <RangePicker
            format="DD-MMM-YYYY"
            placeholder={[t("START_DATE"), t("END_DATE")]}
            locale={
              i18n.language === "es"
                ? datePickerLocales.es
                : datePickerLocales.en
            }
            onChange={onDateChange}
          />
        </Form.Item>
      </Form>
      <Divider></Divider>
      <div className="stats-container">
        <div className="charts-container">
          <div style={{ display: "flex", width: "100%", height: "100%" }}>
            <ResponsiveContainer width="50%" height="100%" minHeight="300px">
              <BarChart data={statsData} label="station">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="station" />
                <YAxis />
                <Tooltip />
                <Legend content={() => renderLegendStations(1)} />

                <Bar dataKey="count">
                  {statsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="50%" height="100%" minHeight="300px">
              {satScore.length > 0 ? (
                <BarChart data={satScore}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" tick={<CustomTick />} />
                  <YAxis dataKey="count" />
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

        <div className="charts-container">
          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            <BarChart data={arrivalTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis>
                <Label value={t("NUM_PTS")} angle="-90" />
              </YAxis>
              <Tooltip />
              <Legend content={() => renderLegendStations(3)} />

              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="50%" height="100%" minHeight="300px">
            <BarChart data={waitTimeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="station_type" />
              <YAxis>
                <Label value={t("MINUTES")} angle="-90" />
              </YAxis>
              <Tooltip />
              <Legend content={() => renderLegendStations(4)} />
              <Bar dataKey="avg_waiting_time" fill="#22CC55" />
              <Bar dataKey="avg_procedure_time" fill="#2255CC" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="charts-container">


        <ResponsiveContainer width="50%" height="100%" minHeight="300px">
  <BarChart width={600} height={300} data={ageGender}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis dataKey="value" />
    <Tooltip />
    <Legend content={() => renderLegendStations(5)} />
    <Bar dataKey="value" fill="fill" />
  </BarChart>
</ResponsiveContainer>




        </div>

        <div style={{ display: "flex", width: "100%", height: "100%" }}></div>
        <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
          {t("DOWNLOAD")}
        </h2>
        <Row>
          <Col>
            <ExcelExport data={patients} reportName="TODAYSPATIENTS" />
          </Col>
          <Col>&nbsp;</Col>
          <Col>
            <ExcelExport data={surveys} reportName="todaysSurveys" />
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
    </div>
  );
};

export default Stats;
