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
import CustomTick from "../../../helpers/CustomTick";

export default function SatScoreChart({ data, colors, titleRenderer }) {
  if (!data || data.length === 0) return <div>Loading…</div>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="level" tick={<CustomTick />} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend content={titleRenderer} />
        <Bar dataKey="count">
          {data.map((entry, idx) => (
            <Cell key={idx} fill={colors[Number(entry.level)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
