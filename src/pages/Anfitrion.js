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
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
} from "firebase/firestore"; // Import necessary methods

import { firestore } from "./../helpers/firebaseConfig";
import {
  handleStatusChange,
  handleDelete,
} from "./../helpers/updateStationStatus";
import { useHistory } from "react-router-dom";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import { useTranslation } from "react-i18next";
import IconSizes from "../helpers/iconSizes";
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
import eye from "../img/eye.svg";
import edit from "../img/edit.svg";
import EditPatientData from "../components/EditPatientData.js";

export const Anfitrion = () => {
  useHideMenu(true);
  const [data, setData] = useState([]);
  const [statsData, setStatsData] = useState([]);
  const [station, setStation] = useState("");
  const [hoveredRowKey, setHoveredRowKey] = useState(null);

  const [t] = useTranslation("global");

  const history = useHistory();

  const handleMouseEnter = (record) => {
    setHoveredRowKey(record.pt_no);
  };

  const handleMouseLeave = () => {
    setHoveredRowKey("");
  };

  const salir = () => {
    localStorage.clear();
    history.replace("/ingresar-host");
  };

  const onSave = () => {
    console.log("Patient data saved");
    // You can also perform other actions like updating state, making API calls, etc.
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set time to the beginning of the day
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1); // Set time to the beginning of the next day

  useEffect(() => {
    let isMounted = true;
    let unsubscribe;
    let unsubscribeStats;

    const fetchData = async () => {
      try {
        // Create references for collections
        const patientsRef = collection(firestore, "patients");
        const statsRef = collection(firestore, "stats");

        // Build queries with the new Firebase v9+ syntax
        const q = query(
          patientsRef,
          orderBy("start_time"),
          where("start_time", ">=", today),
          where("start_time", "<", tomorrow),
          where("complete", "==", false)
        );

        const initialSnapshot = await getDocs(q); // Use 'getDocs' for the initial data fetch
        const statsSnapshot = await getDocs(statsRef);

        const initialData = initialSnapshot.docs.map((doc) => doc.data());
        const initialStats = statsSnapshot.docs.map((doc) => doc.data());

        if (isMounted) {
          setData(initialData);
          setStatsData(initialStats);
        }

        // Listen for real-time updates on the 'patients' collection
        unsubscribe = onSnapshot(q, (snapshot) => {
          const updatedData = snapshot.docs.map((doc) => doc.data());

          if (isMounted) {
            setData(updatedData);
          }
        });

        // Listen for real-time updates on the 'stats' collection
        unsubscribeStats = onSnapshot(statsRef, (snapshot) => {
          const updatedData = snapshot.docs.map((doc) => doc.data());
          setStatsData(updatedData);
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
      if (unsubscribeStats) {
        unsubscribeStats();
      }

      isMounted = false;
    };
  }, [today, tomorrow]);

  // Shows editable icons in the host table

  const renderStatusIcon = (status, station) => {
    let statusIcon = null;
    switch (status) {
      case "pending":
        statusIcon = (
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={not_planned}
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
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={in_process}
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
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={waiting}
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
      case "obs":
        statusIcon = (
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={eye}
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
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={complete}
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
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={two}
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
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={three}
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
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={four}
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
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={five}
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
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={six}
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
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={seven}
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
          <Popover
            content={editStatusContent}
            title={t("modifyStatus")}
            trigger="hover"
          >
            <Image
              src={fin}
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

  const iconScale = 1.5;

  const editStatusContent = //statusPopoverContent is the icon popover
    (
      <Space wrap>
        <Image
          src={not_planned}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() => handleStatusChange("pending", hoveredRowKey, station)}
        />

        <Image
          src={in_process}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange("in_process", hoveredRowKey, station)
          }
        />

        <Image
          src={waiting}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() => handleStatusChange("waiting", hoveredRowKey, station)}
        />

        <Image
          src={eye}
          // width={IconSizes.width}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() => handleStatusChange("obs", hoveredRowKey, station)}
        />
        <Image
          src={complete}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() => handleStatusChange("complete", hoveredRowKey, station)}
        />

        <Image
          src={two}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() => handleStatusChange("2", hoveredRowKey, station)}
        />
        <Image
          src={three}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() => handleStatusChange("3", hoveredRowKey, station)}
        />
        <Image
          src={four}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() => handleStatusChange("4", hoveredRowKey, station)}
        />
        <Image
          src={five}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() => handleStatusChange("5", hoveredRowKey, station)}
        />
        <Image
          src={six}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() => handleStatusChange("6", hoveredRowKey, station)}
        />
        <Image
          src={seven}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
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
        const stationName = plan.station;
        const avg_time = statsData.find(
          (element) => element.station_type === stationName
        );

        if (!uniqueStations[plan.station] && item.fin !== true) {
          const waitText = avg_time
            ? Math.round(avg_time.avg_waiting_time / 60)
            : "";

          uniqueStations[plan.station] = {
            dataIndex: plan.station,
            key: plan.station,
            title: (
              <div>
                {t(plan.station)}
                <div className="wait_times">{waitText}m</div>
                {/* <div className="wait_times">P: {procText}m</div> */}
              </div>
            ),
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
        fixed: "left",
        render: (name) => (
          <table>
            <tbody>
              <tr>
                <td>
                  <b> {name.split("|")[0]} </b>
                  <br /> {name.split("|")[1]} <br />
                  <i>{name.split("|")[2]} </i>
                  <br />
                  {name.split("|")[3]}{" "}
                </td>
                <td align="right">
                  <Popover
                    content={
                      <EditPatientData
                        initialValues={{
                          paciente: name.split("|")[0],
                          tel: name.split("|")[3],
                          motivo: name.split("|")[1],
                          pt_no: hoveredRowKey,
                        }}
                        onSave={onSave}
                      />
                    }
                    title={t("EDITPATIENTDATA")}
                    trigger="click"
                  >
                    <Image
                      src={edit}
                      width={IconSizes.height}
                      height={IconSizes.height}
                      preview={false}
                    />
                  </Popover>
                </td>
              </tr>
            </tbody>
          </table>
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
        render: (avg_time) => {
          const displayValue = isNaN(avg_time) ? 0 : avg_time;
          const style = {
            fontSize: "18px",
            color: displayValue > 15 ? "red" : "inherit",
          };
          return (
            <span style={style}>
              {avg_time.split("|")[0]} min <hr></hr>
              <h5>{avg_time.split("|")[1]} min</h5>
            </span>
          );
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
              title={t("areYouSure")}
              onConfirm={() => handleDelete(hoveredRowKey, history)}
            >
              <Image
                src={fin}
                width={IconSizes.height}
                height={IconSizes.height}
                preview={false}
              />
            </Popconfirm>
          ) : null,
      },
    ];

    const dataSource = extractedPlanOfCare?.map((item) => {
      const stations = {};

      // eslint-disable-next-line no-unused-expressions
      item.plan_of_care?.forEach((plan) => {
        stations[plan.station] = plan.status;
      });

      const avg_time =
        item.avg_time !== 0 && !isNaN(item.avg_time)
          ? Math.floor((Date.now() / 1000 - item.avg_time) / 60)
          : 0;
      return {
        pt_no: item.pt_no,
        patient_name:
          item.patient_name +
          "|" +
          item.reason_for_visit +
          "|" +
          t(item.type_of_visit) +
          "|" +
          (item.tel === null ? " " : "T: " + item.tel),
        avg_time:
          avg_time.toString() +
          "|" +
          Math.round(
            (new Date() - item.start_time.toDate()) / 24 / 60 / 60
          ).toString(),
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
    </>
  );
};
