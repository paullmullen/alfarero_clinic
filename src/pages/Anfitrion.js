import React, { useEffect, useState } from "react";
import {
  Table,
  Form,
  Row,
  Col,
  Input,
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
} from "./../helpers/updateStationStatus";
import { updatePatientData } from "../helpers/updatePatientData";
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

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set time to the beginning of the day
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1); // Set time to the beginning of the next day

  const refreshDoc = async (docRef, newData) => {
    try {
      await docRef.update(newData);
      console.log(`Document with ID ${docRef.id} updated successfully.`);
    } catch (error) {
      console.error(`Error updating document with ID ${docRef.id}:`, error);
    }
  };

  const onFinish = (values) => {
    const { paciente, tel, motivo } = values; // Destructure form values
    updatePatientData(paciente, tel, motivo, hoveredRowKey);
  }

  // Connects info to render on the app with firebase in real time (comunication react-firebase)

  useEffect(() => {
    let isMounted = true;
    let unsubscribe;
    let unsubscribeStats;

    const fetchData = async () => {
      try {
        const collectionRef = firestore.collection("patients");
        const statsRef = firestore.collection("stats");
        const initialSnapshot = await collectionRef
          .orderBy("start_time")
          .where("start_time", ">=", today)
          .where("start_time", "<", tomorrow)
          .get();
        const statsSnapshot = await statsRef.get();

        const initialData = initialSnapshot.docs.map((doc) => {
          const data = doc.data();
          if (!data.pt_no) {
            // If pt_no is blank, replace it with the documentID
            data.pt_no = doc.id;

            // Get a reference to the document in Firestore
            const docRef = collectionRef.doc(doc.id);

            // Call the refreshDoc() function to update the document
            refreshDoc(docRef, data);
          }
          return data;
        });

        const initialStats = statsSnapshot.docs.map((doc) => {
          return doc.data();
        });

        const filteredData = initialData.filter(
          (item) => item.complete !== true
        );

        if (isMounted) {
          setData(filteredData);
          setStatsData(initialStats);
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

        unsubscribeStats = statsRef.onSnapshot((snapshot) => {
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
  }, []);

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

  // Editable content inside the popover (status)
  const editPatientData = (
    <Form
      name="editPatient"
      initialValues={{ remember: true }}
      onFinish={onFinish} // Set onFinish callback
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24}>
          <Form.Item
            label={t("name")}
            name="paciente"
            rules={[{ required: true, message: t("name") }]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24}>
          <Form.Item
            label={t("tel")}
            name="tel"
            rules={[
              {
                validator: (_, value) => {
                  if (value === undefined || value === "") {
                    return Promise.resolve();
                  }
                  if (
                    /^(\+\d{1,3}[-  *])?\(?([0-9]{3,4})\)?[-.●  *]?([0-9]{3,4})[-.●  *]?([0-9]{3,4})?$/.test(
                      value
                    )
                  ) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t("enterValidPhoneNumber")));
                },
              },
            ]}
          >
            <Input type="tel" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24}>
          <Form.Item
            label={t("reasonForVisit")}
            name="motivo"
            rules={[{ required: true, message: t("reasonForVisit") }]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24}>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              shape="round"
              name="save"
            >
              {t("SAVE")}
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
  
  
  

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
                  content={editPatientData}
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
