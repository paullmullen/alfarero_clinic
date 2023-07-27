import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "./../helpers/firebaseConfig";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import { Divider, Table } from "antd";
import { ReactComponent as AngryIcon } from "../img/angry.svg";
import { ReactComponent as SadIcon } from "../img/sad.svg";
import { ReactComponent as IndifferentIcon } from "../img/indifferent.svg";
import { ReactComponent as HappyIcon } from "../img/happy.svg";
import { ReactComponent as ThrilledIcon } from "../img/thrilled.svg";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { stations} from "../helpers/stations";

// Stats functionality


const midnightToday = new Date().setHours(0, 0, 0, 0);

const defaultSort = (a, b) => {
  console.log(a, b);
  if (a < b) return -1;
  if (b < a) return 1;
  return 0;
};

const fetchStatsData = async () => {

  const statsData = [];
  const statsCollection = collection(firestore, "stats");
  const statsSnapshot = await getDocs(statsCollection);

  statsSnapshot.forEach((doc) => {
    const {
      station_type,
      number_of_patients,
      avg_waiting_time,
      avg_procedure_time,
    } = doc.data();

    const dataEntry = {
      station_type,
      Pacientes: number_of_patients,
      "Tiempo Promedio Espera": avg_waiting_time,
      "Tiempo Promedio Procedimiento": avg_procedure_time,
      fill: "#8884d8", // Opcional: Asigna colores personalizados a cada barra
    };

    if (station_type !== "reg") {
      statsData.push(dataEntry);
    }
  });
  return statsData;
};

const satIcon = (value) => {
  switch (value) {
    case 1:
      return <AngryIcon height="30px" width="30px" fill="none" />;
    case 2:
      return <SadIcon height="30px" width="30px" fill="none" />;
    case 3:
      return <IndifferentIcon height="30px" width="30px" vfill="none" />;
    case 4:
      return <HappyIcon height="30px" width="30px" fill="none" />;
    case 5:
      return <ThrilledIcon height="30px" width="30px" fill="none" />;
    default:
      return "";
  }
};

const fetchSurveyData = async () => {
  const surveyData = [];
  const surveyCollection = collection(firestore, "surveys");
  const surveySnapshot = await getDocs(surveyCollection);
  const midnightToday = new Date().setHours(0, 0, 0, 0);

  const surveyEntries = surveySnapshot.docs.map((doc, counter) => {
    const { date, first, satisfaction, suggestion, source } = doc.data();
    const dataEntry = {
      date,
      first,
      satisfaction,
      suggestion,
      source,
    };
    if (dataEntry.date.toDate().getTime() >= midnightToday) {
      return {
        inx: counter,
        first: dataEntry.first,
        source: dataEntry.source,
        suggestion: dataEntry.suggestion,
        satisfaction: satisfaction,
      };
    } else {
      return null; // Return null for entries that don't meet the condition
    }
  });

  // Filter out the null entries and only keep the valid ones
  surveyData.push(...surveyEntries.filter((entry) => entry !== null));

  return surveyData;
};

// Patients functionality

const fetchPatientsData = async () => {
  const patientsData = [];
  const patientsCollection = collection(firestore, "patients");
  const patientsSnapshot = await getDocs(patientsCollection);

  patientsSnapshot.forEach((doc) => {
    const { pt_no, patient_name, start_time, reason_for_visit, plan_of_care } =
      doc.data();
    const dataEntry = {
      pt_no,
      patient_name,
      start_time,
      reason_for_visit,
      plan_of_care,
    };
    let patientPoc = [];
    dataEntry.plan_of_care.forEach((poc) => {
      if (poc.status === "complete") {
        patientPoc.push(poc.station);
      }
    });
    const pocString = patientPoc.join(", ");

    if (dataEntry.start_time.toDate() >= midnightToday) {
      patientsData.push({
        pt_no: dataEntry.pt_no,
        patient_name: dataEntry.patient_name,
        start_time:
          dataEntry.start_time.toDate().getHours().toString().padStart(2, "0") +
          ":" +
          dataEntry.start_time
            .toDate()
            .getMinutes()
            .toString()
            .padStart(2, "0"),
        reason_for_visit: dataEntry.reason_for_visit,
        plan_of_care: pocString,
      });
    }
  });
  return patientsData;
};

const howManyToday = async (stationName) => {
  try {
    const midnightToday = new Date();
    midnightToday.setHours(0, 0, 0, 0);

    const midnightTodayTimestamp =
      firebase.firestore.Timestamp.fromDate(midnightToday);

    const temp = firestore
      .collection("patients")
      .where("start_time", ">=", midnightTodayTimestamp);

    const tempSnapshot = await temp.get();
    tempSnapshot.docs.forEach((d) => {
      const patientData = d.data();

    });

    const query = firestore
      .collection("patients")
      .where("start_time", ">=", midnightTodayTimestamp);

    const querySnapshot = await query.get();

    let count = 0;
    querySnapshot.forEach((doc) => {
      const patient = doc.data();
      patient.plan_of_care.forEach((s) => {
        count += ((s.station === stationName) && (s.status !== "pending")) ? 1 : 0;
      });
    });

    return count;
  } catch (e) {
    console.error("Error fetching patient count:", e);
  }
};

const Stats = () => {
  const [statsData, setStatsData] = useState([]);
  const [patients, setPatients] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [t] = useTranslation("global");

  useEffect(() => {

    const patientsData = async () => {
      const data = await fetchPatientsData();
      const patients = data.map((s) => {
        return {
          ...s,
          station_type: t(s.station_type),
        };
      });
      setPatients(patients);
    };

    patientsData();

    const surveyData = async () => {
      const data = await fetchSurveyData();
      setSurveys(data);
    };

    surveyData();

    const fetchData = async () => {
      try {
        let stats = [];
    
        // Create an array of Promises for each station
        const promises = stations.map(async (s) => {
          const count = await howManyToday(s.value);
          return { station: s.value, count };
        });
    
        // Wait for all promises to resolve using Promise.all()
        stats = await Promise.all(promises);
    
        setStatsData(stats);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [t]);

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

  const barColors = getBarColors();

  const patientsColumns = [
    {
      title: t("patient"),
      dataIndex: "patient_name",
      key: "patient",
      width: 50,
      fixed: "left",
      sorter: {
        compare: (a, b) => defaultSort(a, b),
        multiple: 1,
      },
      render: (name) => <div>{name}</div>,
    },
    {
      title: t("reason_for_visit"),
      dataIndex: "reason_for_visit",
      key: "reason",
      width: 50,
      fixed: "left",
      render: (name) => <div>{name}</div>,
    },
    {
      title: t("start_time"),
      dataIndex: "start_time",
      key: "start_time",
      width: 50,
      fixed: "left",
      defaultSortOrder: "ascend",
      sorter: {
        compare: (a, b) => a.start_time - b.start_time,
        multiple: 1,
      },
      render: (name) => <div>{name}</div>,
    },
    {
      title: t("services"),
      dataIndex: "plan_of_care",
      key: "poc",
      width: 175,
      fixed: "left",
      render: (name) => <div>{name}</div>,
    },
  ];

  const surveyColumns = [
    {
      title: t("source"),
      dataIndex: "source",
      key: "source",
      width: 50,
      fixed: "left",
      render: (name) => <div>{t(name)}</div>,
    },
    {
      title: t("sat"),
      dataIndex: "satisfaction",
      key: "satisfaction",
      width: 50,
      fixed: "left",
      render: (name) => <div>{satIcon(name)}</div>,
    },
    {
      title: t("first"),
      dataIndex: "first",
      key: "first",
      width: 25,
      fixed: "left",
      render: (name) => <div>{name == "1" ? t("yes") : t("no")}</div>,
    },
    {
      title: t("suggestion"),
      dataIndex: "suggestion",
      key: "suggestion",
      width: 125,
      fixed: "left",
      render: (name) => <div>{name}</div>,
    },
  ];

  // Renders the visible screen

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
        {t("patientsPerService")}
      </h2>

      <div style={{ display: "flex", width: "100%", height: "80%" }}>
        <ResponsiveContainer width="50%" height="100%">
          <BarChart data={statsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="station" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count">
              {statsData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="50%" height="100%">
          <BarChart data={statsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="station_type" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Tiempo Promedio Espera">
              {statsData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={barColors[entry.station_type]}
                />
              ))}
            </Bar>
            <Bar dataKey="Tiempo Promedio Procedimiento">
              {statsData.map((entry, index) => (
                <Cell
                  key={`cell2-${index}`}
                  fill={barColors[entry.station_type]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Divider></Divider>
      <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
        {t("todaysComplete")} ({patients.length})
      </h2>
      <Table
        rowKey={"pt_no"}
        columns={patientsColumns}
        dataSource={patients.some((d) => d === undefined) ? [] : patients}
        scroll={{ x: 1500, y: 1500 }}
        sticky
        pagination={false}
        offsetScroll={3}
      />
      <Divider></Divider>
      <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
        {t("todaysSurveys")} ({surveys.length})
      </h2>
      <Table
        rowKey={"inx"}
        columns={surveyColumns}
        dataSource={surveys.some((d) => d === undefined) ? [] : surveys}
        scroll={{ x: 1500, y: 1500 }}
        sticky
        pagination={false}
        offsetScroll={3}
      />
    </div>
  );
};

export default Stats;
