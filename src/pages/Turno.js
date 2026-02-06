import React, { useRef, useEffect, useState } from "react";
import { Table, Image } from "antd";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";

import { firestore } from "./../helpers/firebaseConfig";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import { useTranslation } from "react-i18next";
import { fetchData } from "../helpers/fetchData";
import { useServiceLocation } from "../providers/ServiceLocationProvider";

import IconSizes from "../helpers/iconSizes";
import one from "../img/1.svg";
import two from "../img/2.svg";
import three from "../img/3.svg";
import four from "../img/4.svg";
import five from "../img/5.svg";
import six from "../img/6.svg";
import seven from "../img/7.svg";
import waiting from "../img/waiting.svg";
import in_process from "../img/in_process.svg";
import not_planned from "../img/not_planned.svg";
import complete from "../img/complete.svg";
import fin from "../img/fin.png";
import pay from "../img/pay.svg";

const Turno = () => {
  const { locationId } = useServiceLocation();

  // Treat "__ALL__" as "no filter"
  const locationFilterId = locationId === "__ALL__" ? null : locationId;

  useHideMenu(true);
  const [data, setData] = useState([]);
  const [t] = useTranslation("global");
  const [patientsChanged, setPatientsChanged] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [statsData, setStatsData] = useState([]);

  const tableRef = useRef(null);
  const scrollSpeed = 2; // Adjust scroll speed here
  const scrollingRef = useRef(true);

  const renderStatusIcon = (status) => {
    let statusIcon = null;
    switch (status) {
      case "pending":
        statusIcon = (
          <Image
            src={not_planned}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "in_process":
        statusIcon = (
          <Image
            src={in_process}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "waiting":
        statusIcon = (
          <Image
            src={waiting}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "pay":
        statusIcon = (
          <Image
            src={pay}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "complete":
        statusIcon = (
          <Image
            src={complete}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "1":
        statusIcon = (
          <Image
            src={one}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "2":
        statusIcon = (
          <Image
            src={two}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "3":
        statusIcon = (
          <Image
            src={three}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "4":
        statusIcon = (
          <Image
            src={four}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "5":
        statusIcon = (
          <Image
            src={five}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "6":
        statusIcon = (
          <Image
            src={six}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "7":
        statusIcon = (
          <Image
            src={seven}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "fin":
        statusIcon = (
          <Image
            src={fin}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      default:
        statusIcon = null;
        break;
    }
    return statusIcon;
  };

  const generateTableData = (extractedPlanOfCare) => {
    const uniqueStations = {};
    extractedPlanOfCare.sort((a, b) => {
      const startTimeA = new Date(a.start_time);
      const startTimeB = new Date(b.start_time);
      return startTimeA - startTimeB;
    });

    extractedPlanOfCare.forEach((item) => {
      item.plan_of_care?.forEach((plan) => {
        if (!uniqueStations[plan.station]) {
          uniqueStations[plan.station] = {
            dataIndex: plan.station,
            key: plan.station,
            title: t(plan.station),
            render: (status) => renderStatusIcon(status),
            width: 60,
            align: "center",
          };
        }
      });
    });

    const columns = [
      {
        title: t("patient"),
        dataIndex: "patient_name",
        key: "patient",
        width: 100,
        fixed: "left",
      },
      ...Object.values(uniqueStations),
    ];

    const dataSource = extractedPlanOfCare.map((item) => {
      const stations = {};
      item.plan_of_care.forEach((plan) => {
        stations[plan.station] = plan.status;
      });
      const avg_time =
        item.avg_time !== 0
          ? Math.floor((Date.now() / 1000 - item.avg_time) / 60)
          : 0;

      return {
        pt_no: item.pt_no,
        patient_name: item.patient_name,
        avg_time: avg_time,
        ...stations,
      };
    });

    return { columns, dataSource };
  };

  const { columns, dataSource } = generateTableData(data);

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );

  const todayTimestamp = Timestamp.fromDate(today);
  const tomorrowTimestamp = Timestamp.fromDate(tomorrow);

  useEffect(() => {
    const unsubscribePatients = onSnapshot(
      collection(firestore, "patients"),
      () => setPatientsChanged(true),
    );

    return () => unsubscribePatients();
  }, []);

  // ✅ trigger reload when clinic changes
  useEffect(() => {
    setPatientsChanged(true);
  }, [locationId]);

  useEffect(() => {
    if (!patientsChanged) return;

    let isMounted = true;

    const dateRange = [todayTimestamp, tomorrowTimestamp];

    fetchData({
      dateRange,
      setData,
      setPatientsChanged,
      setStatsData,
      isMounted,
      locationId: locationFilterId, // null means "all"
    });

    return () => {
      isMounted = false;
    };
  }, [patientsChanged, locationFilterId, todayTimestamp, tomorrowTimestamp]);

  const getRowClassName = (record, index) => {
    return index % 2 === 0 ? "even-row" : "odd-row";
  };

  useEffect(() => {
    const tableBody = tableRef.current?.querySelector(".ant-table-body");
    if (!tableBody) return;

    const scrollInterval = setInterval(() => {
      if (!scrollingRef.current) return;

      if (
        tableBody.scrollTop + tableBody.clientHeight >=
        tableBody.scrollHeight
      ) {
        tableBody.scrollTop = 0;
      } else {
        tableBody.scrollTop += scrollSpeed;
      }
    }, 50);

    return () => clearInterval(scrollInterval);
  }, []);

  return (
    <div>
      <AlertInfo />
      <div ref={tableRef} style={{ height: 600, overflow: "hidden" }}>
        <Table
          rowKey={"pt_no"}
          columns={columns}
          dataSource={data.some((d) => d === undefined) ? [] : dataSource}
          scroll={{ y: 600 }}
          pagination={false}
          rowClassName={getRowClassName}
        />
      </div>
    </div>
  );
};

export default Turno;
