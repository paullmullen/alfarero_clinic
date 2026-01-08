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

export default function WaitingTimeChart({ data, titleRenderer, t }) {
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
        <Bar dataKey="range_avg_waiting_time" fill="#22CC55" />
      </BarChart>
    </ResponsiveContainer>
  );
}
