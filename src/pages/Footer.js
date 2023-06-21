import React, { useEffect, useState } from "react";
import { firestore } from "./../helpers/firebaseConfig";
import { Card } from "antd";

const Footer = () => {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const collectionRef = firestore.collection("stats");
        const snapshot = await collectionRef.get();
        const statsData = snapshot.docs.map((doc) => doc.data());
        setStats(statsData);
      } catch (error) {
        console.log(error);
      }
    };

    fetchStats();
  }, []);

  const filteredStats = stats.filter(
    (stat) =>
      stat.station_type &&
      stat.avg_procedure_time !== undefined &&
      stat.avg_waiting_time !== undefined
  );

  const formatTimeInMinutes = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    return `${minutes} minutos`;
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {filteredStats.map((stat, index) => (
        <Card key={index} style={{ margin: 8, width: 300 }}>
          <p><strong>Estacion:</strong> {stat.station_type}</p>
          <p><strong>Promedio de espera:</strong> {stat.avg_waiting_time}</p>
          <p><strong>Promedio del proceso:</strong> {stat.avg_procedure_time}</p>
        </Card>
      ))}
    </div>
  );
};

export default Footer;

