// src/components/stats/StatCharts/WaitingTimeChart.js

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

/**
 * Remove props that can trip React/SVG warnings (e.g., display=true).
 * Works even if entry is null/undefined.
 */
function cleanEntry(entry) {
  if (!entry || typeof entry !== "object") return {};
  const sanitized = { ...entry };
  // Strip problematic keys; add more if your data includes others
  delete sanitized.display;
  delete sanitized.hidden;
  delete sanitized.style;
  return sanitized;
}

export default function WaitingTimeChart({ data, titleRenderer, t }) {
  const safeData = Array.isArray(data) ? data.map(cleanEntry) : [];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={safeData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="station_type" />
        <YAxis allowDecimals={false}>
          <Label value={t("MINUTES")} angle={-90} />
        </YAxis>
        <Tooltip />

        {/*
          IMPORTANT:
          Recharts calls `content={fn}` as fn(legendProps).
          Wrapping prevents legendProps (which include display:true)
          from leaking into your custom legend/title renderer.
        */}
        <Legend content={() => titleRenderer()} />

        {/*
          IMPORTANT:
          Do NOT pass raw data items that include `display` to the bar’s rectangles.
          We feed Recharts the sanitized `safeData` above.
        */}
        <Bar
          dataKey="range_avg_waiting_time"
          fill="#22CC55"
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
