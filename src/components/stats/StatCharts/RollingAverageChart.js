import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Label,
  ResponsiveContainer,
} from "recharts";

export default function RollingAverageChart({
  data,
  titleRenderer,
  t,
  goal = 70,
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis>
          <Label value={t("COUNT")} angle={-90} />
        </YAxis>
        <Tooltip />
        <Legend content={titleRenderer} />
        <ReferenceLine y={goal} stroke="red" label={t("GOAL")} />
        <Bar dataKey="count" fill="#2255CC" />
        <Line
          type="monotone"
          dataKey="average"
          stroke="cyan"
          strokeWidth={4}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
