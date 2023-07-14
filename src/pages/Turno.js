import React, { useEffect, useState } from "react";
import { Table, Image } from "antd";
import { firestore } from "./../helpers/firebaseConfig";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import Footer from "./Footer";
import { useTranslation } from "react-i18next";
import IconSizes from "../helpers/iconSizes";

export const Turno = () => {
  useHideMenu(true);
  const [data, setData] = useState([]);
  const [t] = useTranslation("global");

  // Shows editable icons in the patients table

  const renderStatusIcon = (status) => {
    let statusIcon = null;
    switch (status) {
      case "pending":
        statusIcon = (
          <Image
            src={require("../img/not_planned.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "in_process":
        statusIcon = (
          <Image
            src={require("../img/in_process.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "waiting":
        statusIcon = (
          <Image
            src={require("../img/waiting.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "pay":
        statusIcon = (
          <Image
            src={require("../img/pay.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "complete":
        statusIcon = (
          <Image
            src={require("../img/complete.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "1":
        statusIcon = (
          <Image
            src={require("../img/1.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "2":
        statusIcon = (
          <Image
            src={require("../img/2.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "3":
        statusIcon = (
          <Image
            src={require("../img/3.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "4":
        statusIcon = (
          <Image
            src={require("../img/4.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "5":
        statusIcon = (
          <Image
            src={require("../img/5.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "6":
        statusIcon = (
          <Image
            src={require("../img/6.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "7":
        statusIcon = (
          <Image
            src={require("../img/7.svg")}
            width={IconSizes.width}
            height={IconSizes.height}
            preview={false}
          />
        );
        break;
      case "fin":
        statusIcon = (
          <Image
            src={require("../img/fin.png")}
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

  // Makes render the table that changes in real time (patients and their status)
  const generateTableData = (extractedPlanOfCare) => {
    const uniqueStations = {};
    extractedPlanOfCare.sort((a, b) => {
      const startTimeA = new Date(a.start_time.toMillis());
      const startTimeB = new Date(b.start_time.toMillis());
      return startTimeA - startTimeB;
    });
    extractedPlanOfCare.forEach((item) => {
      // eslint-disable-next-line no-unused-expressions
      item.plan_of_care?.forEach((plan) => {
        if (!uniqueStations[plan.station]) {
          uniqueStations[plan.station] = {
            dataIndex: plan.station,
            key: plan.station,
            title: t(plan.station),
            render: (status) => renderStatusIcon(status),
            width: 100,
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
      {
        title: t("waitingTime"),
        dataIndex: "avg_time",
        key: "patient",
        width: 100,
        align: "center",
        fixed: "right",
        render: (avg_time) => {
          const displayValue = isNaN(avg_time) ? 0 : avg_time;
          const style = {
            fontSize: "18px",
            color: displayValue === 0 ? "red" : "inherit",
          };
          return <span style={style}>{displayValue} min</span>;
        },
      },
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

  useEffect(() => {
    let isMounted = true;
    let unsubscribe;

    const fetchData = async () => {
      try {
        const collectionRef = firestore.collection("patients");
        const initialSnapshot = await collectionRef.orderBy("start_time").get();
        const initialData = initialSnapshot.docs.map((doc) => {
          return doc.data();
        });

        const filteredData = initialData.filter(
          (item) => item.complete !== true
        );

        if (isMounted) {
          setData(filteredData);
        }

        unsubscribe = collectionRef.onSnapshot((snapshot) => {
          const updatedData = snapshot.docs.map((doc) => doc.data());

          if (isMounted) {
            const filteredUpdatedData = updatedData.filter(
              (item) => item.complete !== true
            );
            setData(filteredUpdatedData);
          }
        });
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      isMounted = false;
    };
  }, []);

  const getRowClassName = (record, index) => {
    return index % 2 === 0 ? "even-row" : "odd-row";
  };

  // Renders the visible screen

  return (
    <>
      <AlertInfo />
      <Table
        rowKey={"pt_no"}
        columns={columns}
        dataSource={data.some((d) => d === undefined) ? [] : dataSource}
        // scroll={{ x: 1500, y: 1500 }}
        sticky
        pagination={false}
        offsetScroll={3}
        rowClassName={getRowClassName}

      />
      {/* <Footer /> */}
    </>
  );
};
