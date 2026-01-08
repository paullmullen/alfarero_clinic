import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Label,
  ResponsiveContainer,
} from "recharts";

export default function ProcedureTimeChart({ data, titleRenderer, t }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="station_type" />
        <YAxis allowDecimals={false}>
          <Label value={t("MINUTES")} angle={-90} />
        </YAxis>
        <Tooltip />
        <Legend content={titleRenderer} />
        <Bar dataKey="range_avg_procedure_time" fill="#2255CC" />
      </BarChart>
    </ResponsiveContainer>
  );
}
