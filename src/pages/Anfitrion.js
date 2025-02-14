import React, { useEffect, useState, useRef } from "react";
import {
  Table,
  Image,
  Space,
  Popover,
  Divider,
  Button,
  Popconfirm,
} from "antd";
import { collection, Timestamp, onSnapshot } from "firebase/firestore"; // Import necessary methods
import { fetchData } from "../helpers/fetchData";

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
import { getTodayAndTomorrowTimestamps } from "../helpers/dateHelpers";

export const Anfitrion = () => {
  useHideMenu(true);
  const [data, setData] = useState([]);
  const [statsData, setStatsData] = useState([]);
  const [station, setStation] = useState("");
  const [hoveredRowKey, setHoveredRowKey] = useState(null);
  const [patientsChanged, setPatientsChanged] = useState(true); // for a firestore listener that triggers a useEffect to reload the anfi table.
  const prevPatientsChangedRef = useRef(false); // Ref to store the previous value of patientsChanged.  the initial values of patientsChanged=true and ref=false will trigger the first render.

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

  const { todayTimestamp, tomorrowTimestamp } = getTodayAndTomorrowTimestamps();

  useEffect(() => {
    const unsubscribePatients = onSnapshot(
      collection(firestore, "patients"),
      () => {
        // Whenever there's a change in the 'patients' collection, update the state
        setPatientsChanged(true);
      }
    );

    // Cleanup listener on unmount
    return () => {
      unsubscribePatients();
    };
  }, []); // Only set up the listener once, on mount

  useEffect(() => {
    if (prevPatientsChangedRef.current === false && patientsChanged === true) {
      let isMounted = true;
      let unsubscribe;

      const dateRange = [todayTimestamp, tomorrowTimestamp];

      fetchData({
        dateRange,
        setData,
        setPatientsChanged,
        setStatsData,
        isMounted,
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        isMounted = false;
      };
    }
  }, [patientsChanged]);

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
          onClick={() =>
            handleStatusChange("pending", hoveredRowKey, station, t("CHECKOUT"))
          }
        />

        <Image
          src={in_process}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange(
              "in_process",
              hoveredRowKey,
              station,
              t("CHECKOUT")
            )
          }
        />

        <Image
          src={waiting}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange("waiting", hoveredRowKey, station, t("CHECKOUT"))
          }
        />

        <Image
          src={eye}
          // width={IconSizes.width}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange("obs", hoveredRowKey, station, t("CHECKOUT"))
          }
        />
        <Image
          src={complete}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange(
              "complete",
              hoveredRowKey,
              station,
              t("CHECKOUT")
            )
          }
        />

        <Image
          src={two}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange("2", hoveredRowKey, station, t("CHECKOUT"))
          }
        />
        <Image
          src={three}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange("3", hoveredRowKey, station, t("CHECKOUT"))
          }
        />
        <Image
          src={four}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange("4", hoveredRowKey, station, t("CHECKOUT"))
          }
        />
        <Image
          src={five}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange("5", hoveredRowKey, station, t("CHECKOUT"))
          }
        />
        <Image
          src={six}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange("6", hoveredRowKey, station, t("CHECKOUT"))
          }
        />
        <Image
          src={seven}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          preview={false}
          onClick={() =>
            handleStatusChange("7", hoveredRowKey, station, t("CHECKOUT"))
          }
        />
      </Space>
    );

  // Makes render the table that changes in real time (patients and their status)
  const generateTableData = (extractedPlanOfCare) => {
    const uniqueStations = {};
    // eslint-disable-next-line no-unused-expressions
    extractedPlanOfCare?.sort((a, b) => {
      const startTimeA =
        a?.start_time instanceof Timestamp
          ? a.start_time.toMillis()
          : new Date(a?.start_time).getTime();

      const startTimeB =
        b?.start_time instanceof Timestamp
          ? b.start_time.toMillis()
          : new Date(b?.start_time).getTime();

      return startTimeA - startTimeB;
    });
    // -----------------------------------------------------------------------------------------------------------------------------------------------------
    // This section determines the headers for the table, including both the names of the stations and the average waiting time at that station.
    // -----------------------------------------------------------------------------------------------------------------------------------------------------

    // eslint-disable-next-line no-unused-expressions
    extractedPlanOfCare?.forEach((item) => {
      return item.plan_of_care?.forEach((plan) => {
        const stationName = plan.station;
        const avg_time = statsData.find(
          (element) => element.station_type === stationName
        );
        if (!uniqueStations[plan.station] && item.fin !== true) {
          const max_waiting_time = avg_time?.max_waiting_time || 0; // Get max_waiting_time for the station
          const waitText = avg_time
            ? Math.round(avg_time.avg_waiting_time / 60000) // Convert milliseconds to minutes
            : "";

          const isOverLimit =
            avg_time && avg_time.avg_waiting_time / 1000 > max_waiting_time; // max waiting time is in seconds.  stored data is in milliseconds

          uniqueStations[plan.station] = {
            dataIndex: plan.station,
            key: plan.station,
            title: (
              <div>
                {t(plan.station)}
                <div
                  className="wait_times"
                  style={{
                    color: isOverLimit ? "red" : "inherit",
                    fontWeight: isOverLimit ? "bold" : "normal",
                  }}
                >
                  {waitText}m
                </div>
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
        dataIndex: "wtg_time",
        key: "wtg_time",
        width: 70,
        align: "center",
        fixed: "right",
        render: (wtg_time) => {
          const displayValue = isNaN(wtg_time) ? 0 : wtg_time;
          const style = {
            fontSize: "18px",
            color: displayValue > 15 ? "red" : "inherit",
          };
          return (
            <span style={style}>
              {wtg_time.split("|")[0]} min <hr></hr>
              <h5>{wtg_time.split("|")[1]} min</h5>
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

    // -----------------------------------------------------------------------------------------------------------------------------------------------------
    // This is the content of the table.   The table headers are above
    // -----------------------------------------------------------------------------------------------------------------------------------------------------

    const dataSource = extractedPlanOfCare?.map((item) => {
      const stations = {};
      // eslint-disable-next-line no-unused-expressions
      item.plan_of_care?.forEach((plan) => {
        stations[plan.station] = plan.status;
      });

      // Find all stations with status "in_process" or "waiting"
      const inProcessOrWaitingTimes = item.plan_of_care
        ?.filter(
          (plan) => plan.status === "in_process" || plan.status === "waiting"
        )
        .map((plan) => {
          let timeElapsed = 0;

          if (
            plan.status === "waiting" &&
            plan.waiting_start?._seconds !== undefined
          ) {
            timeElapsed = Math.floor(
              (Timestamp.now().seconds - plan.waiting_start._seconds) / 60
            );
          } else if (plan.status === "waiting") {
            console.warn("Missing or invalid waiting_start for:", plan.station);
          }

          if (
            plan.status === "in_process" &&
            plan.in_process_start?._seconds !== undefined
          ) {
            timeElapsed = Math.floor(
              (Timestamp.now().seconds - plan.in_process_start._seconds) / 60
            );
          } else if (plan.status === "in_process") {
            console.warn(
              "Missing or invalid in_process_start for:",
              plan.station
            );
          }
          return timeElapsed;
        });
      // Find the max time among these stations (or 0 if there are no in_process/waiting stations)
      const current_process = inProcessOrWaitingTimes.length
        ? Math.max(...inProcessOrWaitingTimes)
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
          (item.tel === null ? " " : item.tel),
        wtg_time:
          current_process.toString() + //time at current station if not complete
          "|" +
          Math.round(
            (Timestamp.now().seconds -
              new Date(item.start_time).getTime() / 1000) /
              60
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
