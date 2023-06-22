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
import StationEnum from "../helpers/stationEnum";

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
      TiempoPromedioEspera: avg_waiting_time,
      TiempoPromedioProcedimiento: avg_procedure_time,
      fill: "#8884d8", // Opcional: Asigna colores personalizados a cada barra
    };
    statsData.push(dataEntry);
  });

  return statsData;
};

const Stats = () => {
  const [statsData, setStatsData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchStatsData();
      const stats = data.map((s) => {
        return {
          ...s,
          station_type: StationEnum[s.station_type],
        };
      });
      setStatsData(stats);
    };

    fetchData();
  }, []);

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
        Total de visitas por servicio
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
            <Bar dataKey="TiempoPromedioEspera">
              {statsData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={barColors[entry.station_type]}
                />
              ))}
            </Bar>
            <Bar dataKey="TiempoPromedioProcedimiento">
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
    </div>
  );
};

export default Stats;
