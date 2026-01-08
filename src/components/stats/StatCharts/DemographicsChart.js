import React from "react";
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

export default function DemographicsChart({ data, titleRenderer }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="translatedGroup" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend content={titleRenderer} />
        <Bar dataKey="count">
          {data.map((entry, idx) => (
            <Cell
              key={idx}
              fill={entry.group.includes("FEMININE") ? "#FF69B4" : "#1E90FF"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
