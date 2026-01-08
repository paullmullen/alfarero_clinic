// src/components/stats/PatientsTable.js
import React from "react";
import { Table, Button, Image } from "antd";
import PropTypes from "prop-types";
import enter from "../../img/enter.png";

/**
 * PatientsTable
 *
 * Props:
 *   patients: array of patient objects
 *   patientsByPtNo: Map<pt_no, patient>
 *   onReadmit: function(pt_no) -> void
 *   columns: array (your memoized column definitions)
 */
export function PatientsTable({
  patients,
  patientsByPtNo,
  onReadmit,
  columns,
}) {
  return (
    <Table
      rowKey="pt_no"
      dataSource={patients}
      columns={[
        ...columns,
        {
          title: "",
          key: "readmit",
          width: 20,
          fixed: "left",
          render: (_, record) => {
            const patient = patientsByPtNo.get(record.pt_no);
            const isDisabled = !patient?.complete;
            return (
              <Button
                type="text"
                hidden={isDisabled}
                onClick={() => onReadmit(record.pt_no)}
                style={{ padding: 0 }}
              >
                <Image
                  src={enter}
                  width={20}
                  height={20}
                  preview={false}
                  alt="readmit icon"
                />
              </Button>
            );
          },
        },
      ]}
      scroll={{ x: 500, y: 800 }}
      sticky
      pagination={{ pageSize: 50 }}
    />
  );
}

PatientsTable.propTypes = {
  patients: PropTypes.array.isRequired,
  patientsByPtNo: PropTypes.instanceOf(Map).isRequired,
  onReadmit: PropTypes.func.isRequired,
  columns: PropTypes.array.isRequired,
};
