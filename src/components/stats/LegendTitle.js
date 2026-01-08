// src/components/stats/LegendTitle.js
import React from "react";
import PropTypes from "prop-types";

/**
 * LegendTitle
 *
 * A robust, flexible title component for use inside Recharts <Legend>.
 * Designed to render correctly whether used directly or via:
 *   <Legend content={() => <LegendTitle title="..." />} />
 *
 * Props:
 *   title      - Required. Main title string or ReactNode.
 *   subtitle   - Optional. Secondary text below title.
 *   align      - Optional. "center" (default), "left", "right"
 *   style      - Optional. Additional inline styles for wrapper <div>.
 *   titleStyle - Optional. Styles applied to <h2> title element.
 *   subtitleStyle - Optional. Styles applied to subtitle <div>.
 */

export default function LegendTitle({
  title,
  subtitle,
  align = "center",
  style = {},
  titleStyle = {},
  subtitleStyle = {},
}) {
  // Base layout
  const wrapperStyle = {
    width: "100%",
    textAlign: align,
    padding: "4px 0",
    ...style,
  };

  const mergedTitleStyle = {
    margin: 0,
    padding: 0,
    fontSize: "1.1rem",
    fontWeight: 600,
    ...titleStyle,
  };

  const mergedSubtitleStyle = {
    marginTop: 4,
    opacity: 0.75,
    fontSize: "0.9rem",
    ...subtitleStyle,
  };

  return (
    <div style={wrapperStyle}>
      <h2 style={mergedTitleStyle}>{title}</h2>
      {subtitle ? <div style={mergedSubtitleStyle}>{subtitle}</div> : null}
    </div>
  );
}

LegendTitle.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  align: PropTypes.oneOf(["left", "center", "right"]),
  style: PropTypes.object,
  titleStyle: PropTypes.object,
  subtitleStyle: PropTypes.object,
};
