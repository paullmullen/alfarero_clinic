// src/components/stats/StatCharts/ProcedureTimeChart.js

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

export default function ProcedureTimeChart({ data, titleRenderer, t }) {
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
          SAFE LEGEND:
          Recharts calls `content={fn}` with legendProps (which may include display:true).
          Wrapping prevents those props from leaking into your custom renderer.
        */}
        <Legend content={() => titleRenderer()} />

        {/*
          SAFE BAR:
          Feed Recharts sanitized data and disable animation to avoid prop merging oddities.
        */}
        <Bar
          dataKey="range_avg_procedure_time"
          fill="#2255CC"
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
