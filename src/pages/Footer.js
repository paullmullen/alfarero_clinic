import React, { useEffect, useState } from "react";
import { firestore } from "./../helpers/firebaseConfig";
import { Card } from "antd";
import { useTranslation } from "react-i18next";

// Time footer cards below tables

const Footer = () => {
  const [stats, setStats] = useState([]);
  const [t] = useTranslation("global");

  useEffect(() => {
    const collectionRef = firestore.collection("stats");
    const unsubscribe = collectionRef.onSnapshot((snapshot) => {
      const statsData = snapshot.docs.map((doc) => doc.data());
      setStats(statsData);
    });
    return () => unsubscribe();
  }, []);

  const filteredStats = stats.filter((stat) => {
    const hasStationType = !!stat.station_type;
    const hasProcedureTime = !isNaN(stat.avg_procedure_time) ? stat.avg_procedure_time : "-";
    const hasWaitingTime = !isNaN(stat.avg_waiting_time) ? stat.avg_waiting_time : "-";
  
    return hasStationType && (hasProcedureTime !== "-" || hasWaitingTime !== "-");
  });   

  const formatTime = (seconds) => {
    if (isNaN(seconds)) {
      return "-";
    }
  
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getStationName = (stationCode) => {
    return t(stationCode) || "";
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
            <strong>{getStationName(stat.station_type)}</strong>
          </p>
          <p>
            <strong>{t("waitingTime")}</strong>{" "}
            {formatTime(stat.avg_waiting_time)} (mm:ss)
          </p>
          <p>
            <strong>{t("procedureTime")}</strong>{" "}
            {formatTime(stat.avg_procedure_time)} (mm:ss)
          </p>
        </Card>
      ))}
    </div>
  );
};

export default Footer;
