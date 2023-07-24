import React, { useEffect, useState } from "react";
import {
  Table,
  Image,
  Space,
  Popover,
  Divider,
  Button,
  Popconfirm,
} from "antd";
import { firestore } from "./../helpers/firebaseConfig";
import {
  handleStatusChange,
  handleDelete,
  cleanCompletedPatients,
} from "./../helpers/updateStationStatus";
import { useHistory } from "react-router-dom";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import Footer from "./Footer";
import { useTranslation } from "react-i18next";
import IconSizes from "../helpers/iconSizes";

export const Anfitrion = () => {
  useHideMenu(true);
  const [data, setData] = useState([]);
  const [station, setStation] = useState("");
  const [hoveredRowKey, setHoveredRowKey] = useState(null);
  const [t] = useTranslation("global");

  const history = useHistory();

  const handleMouseEnter = (record) => {
    setHoveredRowKey(record.pt_no);
    console.log(record.pt_no);
  };

  const handleMouseLeave = () => {
    setHoveredRowKey("");
  };

  const salir = () => {
    localStorage.clear();
    history.replace("/ingresar-host");
  };

  // Connects info to render on the app with firebase in real time (comunication react-firebase)

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
          (item) => item.complete !== true,
        );

        if (isMounted) {
          setData(filteredData);
        }

        unsubscribe = collectionRef.onSnapshot((snapshot) => {
          const updatedData = snapshot.docs.map((doc) => doc.data());

          if (isMounted) {
            const filteredUpdatedData = updatedData.filter(
              (item) => item.complete !== true,
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

  // Shows editable icons in the host table

  const renderStatusIcon = (status, station) => {
    let statusIcon = null;
    switch (status) {
      case "pending":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/not_planned.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      case "in_process":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/in_process.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}

            />

          </Popover>
        );
        break;
      case "waiting":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/waiting.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      case "pay":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/pay.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      case "complete":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/complete.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      case "2":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/2.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      case "3":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/3.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      case "4":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/4.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      case "5":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/5.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      case "6":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/6.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      case "7":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/7.svg")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      case "fin":
        statusIcon = (
          <Popover content={content} title={t("modifyStatus")} trigger="hover">
            <Image
              src={require("../img/fin.png")}
              width={IconSizes.height}
              height={IconSizes.height}
              preview={false}
              onMouseEnter={() => {
                setStation(station);
              }}
            />
          </Popover>
        );
        break;
      default:
        statusIcon = null;
        break;
    }
    return statusIcon;
  };

  // Editable content inside the popover (status)

  const content = (
    <Space wrap>
      <Image
        src={require("../img/not_planned.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() =>
          handleStatusChange("pending", hoveredRowKey, station)
        }
      />

      <Image
        src={require("../img/in_process.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() => handleStatusChange("in_process", hoveredRowKey, station)}
      />

      <Image
        src={require("../img/waiting.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() => handleStatusChange("waiting", hoveredRowKey, station)}
      />

      <Image
        src={require("../img/pay.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() => handleStatusChange("pay", hoveredRowKey, station)}
      />

      <Image
        src={require("../img/complete.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() => handleStatusChange("complete", hoveredRowKey, station)}
      />

      <Image
        src={require("../img/2.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() => handleStatusChange("2", hoveredRowKey, station)}
      />
      <Image
        src={require("../img/3.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() => handleStatusChange("3", hoveredRowKey, station)}
      />
      <Image
        src={require("../img/4.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() => handleStatusChange("4", hoveredRowKey, station)}
      />
      <Image
        src={require("../img/5.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() => handleStatusChange("5", hoveredRowKey, station)}
      />
      <Image
        src={require("../img/6.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() => handleStatusChange("6", hoveredRowKey, station)}
      />
      <Image
        src={require("../img/7.svg")}
        width={IconSizes.width}
        height={IconSizes.height}
        preview={false}
        onClick={() => handleStatusChange("7", hoveredRowKey, station)}
      />
    </Space>
  );

  // Makes render the table that changes in real time (patients and their status)
  const generateTableData = (extractedPlanOfCare) => {
    const uniqueStations = {};

    // eslint-disable-next-line no-unused-expressions
    extractedPlanOfCare?.sort((a, b) => {
      const startTimeA = new Date(a?.start_time?.toMillis());
      const startTimeB = new Date(b?.start_time?.toMillis());
      return startTimeA - startTimeB;
    });
    // eslint-disable-next-line no-unused-expressions
    extractedPlanOfCare?.forEach((item) => {
      return item.plan_of_care?.forEach((plan) => {
        if (!uniqueStations[plan.station] && item.fin !== true) {
          uniqueStations[plan.station] = {
            dataIndex: plan.station,
            key: plan.station,
            title: t(plan.station),
            render: (status) => renderStatusIcon(status, plan.station),
            width: IconSizes.width,
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
        width: 175,
        fixed: "left",
        render: (name) => (
          <div>
            <b> {name.split("|")[0]} </b>
            <br></br> {name.split("|")[1]}{" "}
            <br></br>{name.split("|")[2]}{" "}
          </div>
        ),
      },
      ...Object.values(uniqueStations),
      {
        title: t("waitingTime"),
        dataIndex: "avg_time",
        key: "patient",
        width: 70,
        align: "center",
        fixed: "right",
        render: (avg_time ) => {
          const displayValue = isNaN(avg_time) ? 0 : avg_time;
          const style = {
            fontSize: "18px",
            color: displayValue > 15 ? "red" : "inherit",
          };
          return <span style={style}>{avg_time.split("|")[0]} min <hr></hr><h5>{avg_time.split("|")[1]} min</h5></span>;
        },
      },

      {
        title: t("action"),
        dataIndex: "pt_no",
        key: "estado",
        width: 100,
        fixed: "right",
        render: () =>
          dataSource.length >= 1 ? (
            <Popconfirm
              title={hoveredRowKey}
              onConfirm={() => handleDelete(hoveredRowKey)}
              // onConfirm={() => cleanCompletedPatients()}
            >
              <Image
                src={require("../img/fin.png")}
                width={IconSizes.height}
                height={IconSizes.height}
                preview={false}
              />
            </Popconfirm>
          ) : null,
      },
    ];

    const dataSource = extractedPlanOfCare?.map((item, index) => {
      const stations = {};

      // eslint-disable-next-line no-unused-expressions
      item.plan_of_care?.forEach((plan) => {
        stations[plan.station] = plan.status;
      });

      const avg_time =
        item.avg_time !== 0
          ? Math.floor((Date.now() / 1000 - item.avg_time) / 60)
          : 0;
        return {
        pt_no: item.pt_no,
        patient_name: item.patient_name + "|" + item.reason_for_visit + "|" + ((item.tel===null) ? " " : item.tel),
        reason_for_visit: item.reason_for_visit,
        avg_time: avg_time.toString()+"|"+(Math.round((new Date() - item.start_time.toDate())/24/60/60)).toString(),
        ...stations,
      };
    });

    return { columns, dataSource };
  };

  const { columns, dataSource } = generateTableData(data);

  // Helper to add different color on the table depending if it's even or row
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
        onRow={(record) => ({
          onMouseEnter: () => handleMouseEnter(record),
          onMouseLeave: () => handleMouseLeave(),
        })}
      />
      <Divider>
        <Button
          shape="round"
          type="danger"
          onClick={salir}
          style={{ marginTop: "10px" }}
        >
          {/* <CloseCircleOutlined />
          {t("logout")} */}
        </Button>
      </Divider>
      <Footer />
    </>
  );
};
