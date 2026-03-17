import { createCanvas } from "canvas";
import Chart from "chart.js/auto";

const PieSliceLabelsPlugin = {
  id: "pieSliceLabels",
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data?.datasets?.[0];
    const data = dataset?.data ?? [];

    const {
      color = "#fff",
      fontSize = 14,
      fontWeight = "bold",
      total = 0,
    } = pluginOptions || {};

    if (!meta?.data?.length || !total) return;

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${fontWeight} ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    meta.data.forEach((arc, index) => {
      const value = Number(data[index] ?? 0);
      if (!value) return;

      const angle = (arc.startAngle + arc.endAngle) / 2;
      const radius =
        arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.62;
      const x = arc.x + Math.cos(angle) * radius;
      const y = arc.y + Math.sin(angle) * radius;

      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        Number.isNaN(x) ||
        Number.isNaN(y)
      ) {
        return;
      }

      const pct = ((value / total) * 100).toFixed(0);
      ctx.fillText(`${value}`, x, y - 8);
      ctx.fillText(`${pct}%`, x, y + 10);
    });

    ctx.restore();
  },
};

export function generateNewVsRepeatPieChart(todaySnapshot) {
  let newCount = 0;
  let repeatCount = 0;

  todaySnapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    if (data.new_patient === true) newCount++;
    else repeatCount++;
  });

  const total = newCount + repeatCount;

  const canvas = createCanvas(600, 350);
  const ctx = canvas.getContext("2d");

  const hasData = total > 0;

  new Chart(ctx, {
    type: "pie",
    plugins: [PieSliceLabelsPlugin],
    data: {
      labels: hasData ? ["Nuevos", "Repetidos"] : ["Sin datos"],
      datasets: [
        {
          data: hasData ? [newCount, repeatCount] : [1],
          backgroundColor: hasData ? ["#3367D6", "#FF7043"] : ["#D9D9D9"],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      devicePixelRatio: 2,
      plugins: {
        title: { display: false },
        legend: {
          display: true,
          position: "right",
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (!hasData) return "Sin datos";
              const value = ctx.parsed ?? 0;
              const pct = ((value / total) * 100).toFixed(1);
              return `${ctx.label}: ${value} (${pct}%)`;
            },
          },
        },
        pieSliceLabels: {
          total,
          color: "#fff",
          fontSize: 14,
          fontWeight: "bold",
        },
      },
    },
  });

  return canvas.toDataURL();
}
