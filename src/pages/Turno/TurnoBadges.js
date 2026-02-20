import React from "react";

export function CheckBadge() {
  return (
    <span className="doneBadge">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 6L9 17l-5-5"
          fill="none"
          stroke="#0F172A"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function WaitingBadge() {
  // simple "stopwatch/clock" glyph (inline SVG), no extra deps
  return (
    <span className="waitingBadge" aria-label="Waiting">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 2h6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle
          cx="12"
          cy="13"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="M12 13V9.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M12 13l2.6 1.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
