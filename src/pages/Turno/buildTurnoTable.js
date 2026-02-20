import React from "react";
import PatientCell from "./PatientCell";

export function buildTurnoTable({ patients, t, renderStationCell }) {
  const extracted = Array.isArray(patients) ? [...patients] : [];

  extracted.sort((a, b) => {
    const ta = new Date(a?.start_time ?? 0).getTime();
    const tb = new Date(b?.start_time ?? 0).getTime();
    return ta - tb;
  });

  const uniqueStations = {};

  extracted.forEach((pt) => {
    (pt?.plan_of_care ?? []).forEach((plan) => {
      if (!plan?.station) return;

      const station = String(plan.station);

      if (!uniqueStations[station]) {
        uniqueStations[station] = {
          dataIndex: station,
          key: station,
          title: t(station),
          render: (status) => renderStationCell({ station, status }),
          width: 78,
          align: "center",
        };
      }
    });
  });

  const patientColumn = {
    title: t("patient"),
    dataIndex: "patient_name",
    key: "patient",
    width: 260,
    fixed: "left",
    render: (_, record) => <PatientCell record={record} />,
  };

  const cols = [patientColumn, ...Object.values(uniqueStations)];

  const rows = extracted.map((pt) => {
    const stations = {};
    (pt?.plan_of_care ?? []).forEach((plan) => {
      if (!plan?.station) return;
      stations[String(plan.station)] = plan.status;
    });

    return {
      pt_no: pt.pt_no,
      patient_name: pt.patient_name,
      ...stations,
      __rawPatient: pt,
    };
  });

  return { columns: cols, dataSource: rows };
}