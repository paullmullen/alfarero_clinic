import React, { useRef, useEffect, useState } from "react";
import { Table, Image } from "antd";
import { firestore } from "./../helpers/firebaseConfig";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import { useTranslation } from "react-i18next";
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

export const Turno = () => {
  useHideMenu(true);
  const [data, setData] = useState([]);
  const [t] = useTranslation("global");

  const tableRef = useRef(null);

  // Shows editable icons in the patients table

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
      // {
      //   title: t("waitingTime"),
      //   dataIndex: "avg_time",
      //   key: "patient",
      //   width: 100,
      //   align: "center",
      //   fixed: "right",
      //   render: (avg_time) => {
      //     const displayValue = isNaN(avg_time) ? 0 : avg_time;
      //     const style = {
      //       fontSize: "18px",
      //       color: displayValue => 15  ? "red" : "inherit",
      //     };
      //     return <span style={style}>{displayValue} min</span>;
      //   },
      // },
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

  const autoScroll = () => {
    const scrollAmount = 20; // pixels
    const scrollSpeed = 1000; // milliseconds
    const scrollMax = 15000; // total size
    let scrollPosition = 0;

    const scrollInterval = setInterval(() => {
      scrollPosition =
        scrollPosition > scrollMax ? 0 : scrollPosition + scrollAmount;

      const scrollContainer = document.querySelector("div.ant-table-body");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollPosition;
      }
    }, scrollSpeed);

    return () => clearInterval(scrollInterval); // Clean up the interval when the component unmounts
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribe;

    const fetchData = async () => {
      try {
        const collectionRef = firestore
          .collection("patients")
          .orderBy("complete") // Order by complete first
          .orderBy("start_time") // Then order by start_time
          .where("complete", "!=", true);
        const initialSnapshot = await collectionRef.get();
        const initialData = initialSnapshot.docs.map((doc) => {
          return doc.data();
        });

        if (isMounted) {
          setData(initialData);
        }

        unsubscribe = collectionRef.onSnapshot((snapshot) => {
          const updatedData = snapshot.docs.map((doc) => doc.data());

          if (isMounted) {
            setData(updatedData);
            autoScroll();
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
      clearInterval(autoScroll()); // Clear the interval when the component unmounts
    };
  }, []);

  const getRowClassName = (record, index) => {
    return index % 2 === 0 ? "even-row" : "odd-row";
  };

  // Renders the visible screen
  return (
    <div ref={tableRef} className="table-container">
      <AlertInfo />
      <Table
        rowKey={"pt_no"}
        columns={columns}
        dataSource={data.some((d) => d === undefined) ? [] : dataSource}
        scroll={{ x: 1500, y: 1500 }}
        sticky
        pagination={false}
        rowClassName={getRowClassName}
      />
      {/* <Footer /> */}
    </div>
  );
};
