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
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center", // Centra las tarjetas horizontalmente
      }}
    >
      {filteredStats.map((stat, index) => (
        <Card
          key={index}
          style={{
            margin: 8,
            flexBasis: 180, // Establece el ancho inicial de la tarjeta
            flexGrow: 1, // Permite que la tarjeta crezca si hay espacio disponible
            maxWidth: 180, // Establece el ancho máximo de la tarjeta
          }}
        >
          <p>
            <strong>Estacion:</strong> {stat.station_type}
          </p>
          <p>
            <strong>Espera:</strong> {stat.avg_waiting_time} segundos
          </p>
          <p>
            <strong>Proceso:</strong> {stat.avg_procedure_time} segundos
          </p>
        </Card>
      ))}
    </div>
  );
};

export default Footer;
