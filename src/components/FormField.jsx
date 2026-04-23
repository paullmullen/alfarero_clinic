import React from "react";
import PropTypes from "prop-types";
import { Typography } from "antd";

const { Text } = Typography;

export default function FormField({
  label,
  help,
  children,
  style = {},
  contentStyle = {},
}) {
  return (
    <div style={{ ...styles.wrapper, ...style }}>
      {label ? (
        <Text strong style={styles.label}>
          {label}
        </Text>
      ) : null}

      {help ? (
        <Text type="secondary" style={styles.help}>
          {help}
        </Text>
      ) : null}

      <div style={{ ...styles.content, ...contentStyle }}>{children}</div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
  },
  label: {
    display: "block",
    marginBottom: 4,
    lineHeight: 1.25,
  },
  help: {
    display: "block",
    marginBottom: 8,
    lineHeight: 1.35,
  },
  content: {
    width: "100%",
  },
};

FormField.propTypes = {
  label: PropTypes.node,
  help: PropTypes.node,
  children: PropTypes.node.isRequired,
  style: PropTypes.object,
  contentStyle: PropTypes.object,
};
