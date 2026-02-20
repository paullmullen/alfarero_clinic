import React from "react";

function getProgressCounts(patient) {
  const steps = Array.isArray(patient?.plan_of_care)
    ? patient.plan_of_care
    : [];
  const planned = steps.filter((s) => s?.status && s.status !== "pending");
  const total = planned.length;
  const completeCount = planned.filter((s) => s?.status === "complete").length;
  return { total, completeCount };
}

function ProgressDots({ total = 0, completeCount = 0 }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeComplete = Math.min(
    safeTotal,
    Math.max(0, Number(completeCount) || 0),
  );
  if (safeTotal === 0) return null;

  return (
    <span className="progressDots">
      {Array.from({ length: safeTotal }).map((_, i) => {
        const done = i < safeComplete;
        return <span key={i} className={`dot ${done ? "done" : "todo"}`} />;
      })}
    </span>
  );
}

export default function PatientCell({ record }) {
  const raw = record.__rawPatient;
  const { total, completeCount } = getProgressCounts(raw);

  return (
    <div className="patientCell">
      <ProgressDots total={total} completeCount={completeCount} />
      <div className="patientName">{record.patient_name}</div>
    </div>
  );
}
