// src/components/stats/StatCharts/StationBarChart.js

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

export default function StationBarChart({ data, colors, titleRenderer }) {
  const safeData = Array.isArray(data) ? data.map(cleanEntry) : [];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={safeData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="station_type" />
        <YAxis allowDecimals={false} />
        <Tooltip />

        {/*
          SAFE LEGEND:
          Recharts calls `content={fn}` with legendProps (which includes display:true).
          Wrapping prevents those props from reaching your LegendTitle.
        */}
        <Legend content={() => titleRenderer()} />

        {/*
          SAFE CELLS:
          Do NOT spread `entry` into <Cell />.
          Only pass explicit props to avoid leaking invalid attributes to <path>.
        */}
        <Bar dataKey="range_count" isAnimationActive={false}>
          {safeData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors?.[entry.station_type] ?? "#8884d8"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
