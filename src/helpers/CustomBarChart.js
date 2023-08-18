import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from "recharts";

const CustomBarChart = ({ data, dataKey, barColors }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="station" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey={dataKey}>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

export default CustomBarChart;
