/* eslint-disable react/prop-types */


import React from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useTranslation } from "react-i18next";

const ExcelExport = ({ data, reportName }) => {
  // Function to convert data to Excel worksheet

  const [t] = useTranslation("global");

  const dataToWorksheet = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(excelBlob, 'data.xlsx');
  };

  return (
    <button onClick={dataToWorksheet}>{t(reportName)}</button>
  ); 
};

export default ExcelExport;
