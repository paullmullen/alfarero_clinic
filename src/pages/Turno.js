import React, { useEffect, useState } from "react";
import { Table, Image } from "antd";
import { firestore } from "./../helpers/firebaseConfig";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import Footer from "./Footer";
import { useTranslation } from "react-i18next";

export const Turno = () => {
  useHideMenu(true);
  const [data, setData] = useState([]);
  const [countdown, setCountdown] = useState({});
  const [t] = useTranslation("global");

  // Shows editable icons in the patients table

  const renderStatusIcon = (status) => {
    let statusIcon = null;
    switch (status) {
      case "pending":
        statusIcon = (
          <Image
            src={require("../img/not_planned.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "in_process":
        statusIcon = (
          <Image
            src={require("../img/in_process.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "waiting":
        statusIcon = (
          <Image
            src={require("../img/waiting.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "pay":
        statusIcon = (
          <Image
            src={require("../img/pay.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "complete":
        statusIcon = (
          <Image
            src={require("../img/complete.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "1":
        statusIcon = (
          <Image
            src={require("../img/1.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "2":
        statusIcon = (
          <Image
            src={require("../img/2.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "3":
        statusIcon = (
          <Image
            src={require("../img/3.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "4":
        statusIcon = (
          <Image
            src={require("../img/4.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "5":
        statusIcon = (
          <Image
            src={require("../img/5.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "6":
        statusIcon = (
          <Image
            src={require("../img/6.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "7":
        statusIcon = (
          <Image
            src={require("../img/7.svg")}
            width={30}
            height={80}
            preview={false}
          />
        );
        break;
      case "fin":
        statusIcon = (
          <Image
            src={require("../img/fin.png")}
            width={45}
            height={35}
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
        dataIndex: "pt_no",
        key: "countdown",
        width: 100,
        fixed: "right",
        align: "center",
        render: (pt_no) => {
          const remainingTime = countdown[pt_no] || 0;

          return (
            <span
              style={{
                color: remainingTime === 0 ? "red" : "inherit",
                fontSize: "18px",
              }}
            >
              {remainingTime} min
            </span>
          );
        },
      },
    ];

    const dataSource = extractedPlanOfCare.map((item) => {
      const stations = {};
      item.plan_of_care.forEach((plan) => {
        stations[plan.station] = plan.status;
      });
      return {
        pt_no: item.pt_no,
        patient_name: item.patient_name,
        ...stations,
      };
    });

    return { columns, dataSource };
  };

  const { columns, dataSource } = generateTableData(data);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const collectionRef = firestore.collection("patients");
        const snapshot = await collectionRef.orderBy("start_time").get();
        const initialData = snapshot.docs.map((doc) => {
          return doc.data();
        });

        if (isMounted) {
          setData(initialData);
        }

        const updatedCountdownData = {};

        initialData.forEach((item) => {
          const pt_no = item.pt_no;
          const avgWaitingTime = item.avg_time || 0;
          const remainingTime = Math.max(Math.ceil(avgWaitingTime), 0);

          updatedCountdownData[pt_no] = remainingTime;

          const countdownInterval = setInterval(() => {
            updatedCountdownData[pt_no] = Math.max(
              updatedCountdownData[pt_no] - 1,
              0
            );
            setCountdown({ ...updatedCountdownData });

            if (updatedCountdownData[pt_no] === 0) {
              clearInterval(countdownInterval);
            }
          }, 60000);

          if (updatedCountdownData[pt_no] === 0) {
            clearInterval(countdownInterval);
          }
        });

        const hasWaitingOrInProgress = initialData.some((item) =>
          item.plan_of_care?.some(
            (plan) => plan.status === "waiting" || plan.status === "in_process"
          )
        );

        if (!hasWaitingOrInProgress) {
          Object.keys(updatedCountdownData).forEach((pt_no) => {
            updatedCountdownData[pt_no] = 0;
          });
        }

        setCountdown(updatedCountdownData);

        const unsubscribe = collectionRef.onSnapshot((snapshot) => {
          const updatedData = snapshot.docs.map((doc) => doc.data());

          if (isMounted) {
            setData(updatedData);
          }
        });

        return () => {
          unsubscribe();
          isMounted = false;
        };
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();

    return () => {
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
        scroll={{ x: 1500, y: 1500 }}
        sticky
        offsetScroll={3}
        rowClassName={getRowClassName}
      />
      <Footer />
    </>
  );
};
