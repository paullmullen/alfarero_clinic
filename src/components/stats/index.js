// src/components/stats/index.js
export * from "./PatientsTable"; // named export: PatientsTable
export * from "./SurveysTable"; // named export: SurveysTable
export { default as LegendTitle } from "./LegendTitle"; // default re-export

// Re-export chart barrel as a namespace called "Charts"
export * as Charts from "./StatCharts";
