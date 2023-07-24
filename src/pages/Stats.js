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
import Column from "antd/lib/table/Column";

// Stats functionality

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

    statsData.push(dataEntry);
  });

  return statsData;
};

// Patients functionality

const fetchPatientsData = async () => {
  const patientsData = [];
  const patientsCollection = collection(firestore, "patients");
  const patientsSnapshot = await getDocs(patientsCollection);
  const midnightToday = new Date().setHours(0, 0, 0, 0);


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
    const pocString = patientPoc.join(', ');

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

const Stats = () => {
  const [statsData, setStatsData] = useState([]);
  const [patients, setPatients] = useState([]);
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

    const fetchData = async () => {
      const data = await fetchStatsData();
      const stats = data.map((s) => {
        return {
          ...s,
          station_type: t(s.station_type),
        };
      });
      setStatsData(stats);
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
  const patientsColumns = [
    {
      title: t("patient"),
      dataIndex: "patient_name",
      key: "patient",
      width: 50,
      fixed: "left",
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
  const barColors = getBarColors();

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
            <XAxis dataKey="station_type" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Pacientes">
              {statsData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={barColors[entry.station_type]}
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
        // scroll={{ x: 1500, y: 1500 }}
        sticky
        pagination={false}
        offsetScroll={3}
      />
    </div>
  );
};

export default Stats;
