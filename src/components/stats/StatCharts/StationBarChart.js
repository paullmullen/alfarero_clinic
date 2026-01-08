import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function StationBarChart({ data, colors, titleRenderer }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="station_type" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend content={titleRenderer} />
        <Bar dataKey="range_count">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[entry.station_type] || "#8884d8"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
