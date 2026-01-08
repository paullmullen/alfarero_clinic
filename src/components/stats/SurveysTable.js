// src/components/stats/SurveysTable.js
import React from "react";
import { Table } from "antd";
import PropTypes from "prop-types";

/**
 * SurveysTable
 *
 * Props:
 *   surveys: array of survey objects
 *   columns: array (your memoized column definitions)
 */
export function SurveysTable({ surveys, columns }) {
  return (
    <Table
      rowKey="inx"
      dataSource={surveys}
      columns={columns}
      scroll={{ x: 580, y: 800 }}
      sticky
      pagination={{ pageSize: 50 }}
    />
  );
}

SurveysTable.propTypes = {
  surveys: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
};
