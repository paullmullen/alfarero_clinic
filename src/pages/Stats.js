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
  Text,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import { Divider, Table, Typography } from "antd";

import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { stations } from "../helpers/stations";
import { fetchSurveyData } from "../helpers/fetchSurveyData";
import { fetchPatientsData } from "../helpers/fetchPatientsData";
import { midnightToday } from "../helpers/midnightToday";
import { satIcon } from "../helpers/satIcon";
import { defaultSort } from "../helpers/defaultSort";



const howManyToday = async (stationName) => {
  try {
    const midnightToday = new Date();
    midnightToday.setHours(0, 0, 0, 0);

    const midnightTodayTimestamp =
      firebase.firestore.Timestamp.fromDate(midnightToday);

    const temp = firestore
      .collection("patients")
      .where("start_time", ">=", midnightTodayTimestamp);

    const query = firestore
      .collection("patients")
      .where("start_time", ">=", midnightTodayTimestamp);

    const querySnapshot = await query.get();

    let count = 0;
    querySnapshot.forEach((doc) => {
      const patient = doc.data();
      patient.plan_of_care.forEach((s) => {
        count += s.station === stationName && s.status !== "pending" ? 1 : 0;
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
  const [satScore, setSatScore] = useState([]);

  const [t] = useTranslation("global");

  const surveyData = async () => {
    const data = await fetchSurveyData();
    const satScore = await surveySummary(data);
    setSatScore(satScore);
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
      { level: 1, count: histogram[1] },
      { level: 2, count: histogram[2] },
      { level: 3, count: histogram[3] },
      { level: 4, count: histogram[4] },
      { level: 5, count: histogram[5] },
    ];
    return satScore;
  };

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

  useEffect(() => {
    const doStuffInOrder = async () => {
      await patientsData();
      await stationsData();
      await surveyData();
    };
    doStuffInOrder();
  }, [t]);

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
      title: t("type_of_visit"),
      dataIndex: "type_of_visit",
      key: "type",
      width: 50,
      fixed: "left",
      render: (name) => <div>{t(name)}</div>,
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
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <ResponsiveContainer width="50%" height="100%">
          <BarChart data={statsData} label="hello">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="station" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count">
              {statsData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={barColors[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="50%" height="100%">
          {satScore.length > 0 ? (
            <BarChart data={satScore}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" />
              <YAxis dataKey="count" />
              <Tooltip />
              <Legend />
              <Bar dataKey="count">
                {surveys.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={barColors[entry.level]} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <div>Loading...</div>
          )}
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
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
