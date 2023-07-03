import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Typography,
  Button,
  Divider,
  Table,
  Image,
  Alert,
  Switch,
  Select,
} from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { useHideMenu } from "../hooks/useHideMenu";
import { getUsuarioStorage } from "../helpers/getUsuarioStorage";
import { Redirect, useHistory } from "react-router-dom";
import { firestore } from "./../helpers/firebaseConfig";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;
const { Option } = Select;

export const Escritorio = () => {
  const [documents, setDocuments] = useState([]);
  const [usuario] = useState(getUsuarioStorage());
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const history = useHistory();

  const [visible, setVisible] = useState(true);
  const [patientStatus, setPatientStatus] = useState({});
  const [t, i18n] = useTranslation("global");

  const handleClose = () => {
    setVisible(false);
  };

  // Connects info to render on the app with firebase in real time (comunication react-firebase)

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const collectionRef = firestore.collection("patients");
      const snapshot = await collectionRef.orderBy("start_time", "asc").get();
      const initialData = snapshot.docs.map((doc) => doc.data());

      if (isMounted) {
        const filteredData = initialData.filter(
          (doc) =>
            doc.complete !== true &&
            doc.plan_of_care.some((item) => item.station === usuario.servicio)
        );
        const statusObj = filteredData.reduce((obj, doc) => {
          obj[doc.pt_no] = doc.complete;
          return obj;
        }, {});
        setPatientStatus(statusObj);
        filteredData.sort(
          (a, b) => a.start_time.toMillis() - b.start_time.toMillis()
        );
        setDocuments(filteredData);
        setFilteredDocuments(filteredData);
      }

      const unsubscribe = collectionRef.onSnapshot((snapshot) => {
        const updatedData = snapshot.docs.map((doc) => doc.data());

        if (isMounted) {
          const filteredData = updatedData.filter(
            (doc) =>
              doc.complete !== true &&
              doc.plan_of_care.some((item) => item.station === usuario.servicio)
          );
          const statusObj = filteredData.reduce((obj, doc) => {
            obj[doc.pt_no] = doc.complete;
            return obj;
          }, {});
          setPatientStatus(statusObj);
          filteredData.sort(
            (a, b) => a.start_time.toMillis() - b.start_time.toMillis()
          );
          setDocuments(filteredData);
          setFilteredDocuments(filteredData);
        }
      });

      return () => {
        unsubscribe();
        isMounted = false;
      };
    };
    fetchData();
  }, [usuario.servicio]);

  const salir = () => {
    localStorage.clear();
    history.replace("/ingresar-host");
  };

  // Shows editable icons in doctors/healthcare personal table

  const statusPaciente = (record) => {
    const currentStatus =
      record.plan_of_care.find((item) => item.station === usuario.servicio)
        ?.status || "";
    let statusIcon = null;

    switch (currentStatus) {
      case "waiting":
        statusIcon = (
          <Image
            src={require("../img/waiting.svg")}
            width={15}
            height={10}
            preview={false}
          />
        );
        break;
      case "in_process":
        statusIcon = (
          <Image
            src={require("../img/in_process.svg")}
            width={15}
            height={10}
            preview={false}
          />
        );
        break;
      case "complete":
        statusIcon = (
          <Image
            src={require("../img/complete.svg")}
            width={15}
            height={10}
            preview={false}
          />
        );
        break;
      case "fin":
        statusIcon = (
          <Image
            src={require("../img/fin.png")}
            width={20}
            height={15}
            preview={false}
          />
        );
        break;
      case "pay":
        statusIcon = (
          <Image
            src={require("../img/pay.svg")}
            width={15}
            height={10}
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

  useHideMenu(false);

  if (!usuario.host || !usuario.servicio) {
    return <Redirect to="/ingresar-host" />;
  }

  // Content of the whole rendered table
  const columns = [
    {
      title: t("patientName"),
      dataIndex: "patient_name",
      key: "paciente",
    },
    {
      title: t("age"),
      dataIndex: "age",
      key: "edad",
    },
    {
      title: t("reasonForVisit"),
      dataIndex: "reason_for_visit",
      key: "sintomas",
    },
    {
      title: t("currentStatus"),
      dataIndex: "",
      key: "",
      render: (record) => statusPaciente(record),
      width: 100,
      align: "center",
    },
    {
      title: t("updateStatus"),
      dataIndex: "status",
      key: "status",
      width: 250,
      align: "center",
      render: (text, record) => (
        <div className="center-cell">
          <Select
            value={record.status}
            onChange={(value) => handleStatusChange(record, value)}
            size="large"
            style={{ width: "100%" }} // Ajustar el ancho del Select al 100%
          >
            <Option value="in_process">{t("beingAttended")}</Option>
            <Option value="waiting">{t("waiting")}</Option>
            <Option value="complete">{t("visitCompleted")}</Option>
            <Option value="pay">{t("visitPayed")}</Option>
          </Select>
        </div>
      ),
    },
    {
      title: "",
      dataIndex: "complete",
      key: "estado",
      render: (complete, record) => (
        <Link
          to="#"
          onClick={() => handleCompleteChange(record)}
          style={{ color: complete ? "green" : "red", cursor: "pointer" }}
        >
          {complete ? "Completo" : "Eliminar"}
        </Link>
      ),
    },
  ];

  // Functionality of changing and update status

  const handleCompleteChange = (record) => {
    const updatedComplete = !record.complete;

    firestore.collection("patients").doc(record.pt_no).update({
      complete: updatedComplete,
    });
  };
  //
  const handleStatusChange = async (record, value) => {
    const currentStation = usuario.servicio;
    const updatedPlanOfCare = record.plan_of_care.map((item) => {
      if (item.station === currentStation) {
        const updatedItem = {
          ...item,
          status: value,
        };

        if (value === "waiting" && item.status !== "waiting") {
          updatedItem.wait_start = Math.floor(Date.now() / 1000);
        } else if (value === "in_process" && item.status !== "in_process") {
          updatedItem.procedure_start = Math.floor(Date.now() / 1000);
        } else if (value !== "waiting" && item.status === "waiting") {
          updatedItem.wait_end = Math.floor(Date.now() / 1000);
          updatedItem.waiting_time = Math.abs(
            updatedItem.wait_end - updatedItem.wait_start
          );
        } else if (value !== "in_process" && item.status === "in_process") {
          updatedItem.procedure_end = Math.floor(Date.now() / 1000);
          updatedItem.procedure_time = Math.abs(
            updatedItem.procedure_end - updatedItem.procedure_start
          );
        }

        return updatedItem;
      }

      return item;
    });

    await firestore.collection("patients").doc(record.pt_no).update({
      plan_of_care: updatedPlanOfCare,
    });

    const statsDocRef = firestore.collection("stats").doc(currentStation);
    const doc = await statsDocRef.get();

    if (doc.exists) {
      const statsData = doc.data();
      const updatedItem = updatedPlanOfCare.find(
        (item) => item.station === currentStation
      );

      if (value === "waiting" && updatedItem.wait_start) {
        const waitDifference = Math.abs(updatedItem.waiting_time);
        await statsDocRef.update({
          waiting_time_data: [
            ...(statsData.waiting_time_data || []),
            waitDifference,
          ].filter((time) => !isNaN(time)),
        });
      }

      if (value === "in_process" && updatedItem.procedure_start) {
        const inProcessDifference = Math.abs(updatedItem.procedure_time);
        await statsDocRef.update({
          procedure_time_data: [
            ...(statsData.procedure_time_data || []),
            inProcessDifference,
          ].filter((time) => !isNaN(time)),
        });
      }

      const { waiting_time_data, procedure_time_data, number_of_patients } =
        statsData;

      if (number_of_patients) {
        const validWaitingTimeData = waiting_time_data.filter(
          (time) => !isNaN(time)
        );
        const waitingAverage = Math.floor(
          validWaitingTimeData.reduce((acc, time) => acc + time, 0) /
            number_of_patients
        );
        await statsDocRef.update({
          avg_waiting_time: waitingAverage,
        });
      }

      if (procedure_time_data && number_of_patients) {
        const validProcedureTimeData = procedure_time_data.filter(
          (time) => !isNaN(time)
        );
        const procedureAverage = Math.floor(
          validProcedureTimeData.reduce((acc, time) => acc + time, 0) /
            number_of_patients
        );
        await statsDocRef.update({
          avg_procedure_time: procedureAverage,
        });

        if (value === "in_process" || value === "waiting") {
          await firestore
            .collection("patients")
            .doc(record.pt_no)
            .update({
              avg_time: Math.floor(Date.now() / 1000),
            });
        }
      }
    }
  };

  // Helper to add different color on the table depending if it's even or row

  const getRowClassName = (record, index) => {
    return index % 2 === 0 ? "even-row" : "odd-row";
  };

  // Renders the visible screen

  return (
    <>
      {visible && (
        <Alert
          message={t("infoPatient")}
          description={
            <div
              style={{
                display: "flex",
                justifyContent: "space-evenly",
                marginTop: 18,
              }}
            >
              <div>
                <Image
                  src={require("../img/waiting.svg")}
                  width={15}
                  height={10}
                />
                {t("waiting")}
              </div>
              <div>
                <Image
                  src={require("../img/in_process.svg")}
                  width={15}
                  height={10}
                />
                {t("beingAttended")}
              </div>
              <div>
                <Image
                  src={require("../img/complete.svg")}
                  width={15}
                  height={10}
                />
                {t("visitCompleted")}
              </div>
            </div>
          }
          type="info"
          showIcon
          closable
          afterClose={handleClose}
        />
      )}
      <Row>
        <Col span={20}>
          <Switch
            onChange={setVisible}
            checked={visible}
            style={{ marginTop: "10px" }}
          ></Switch>
          <Divider />
          <Title level={2}>{usuario.host}</Title>
          <Text>{t("currentService")} </Text>
          <Text type="success" strong>
            {t(usuario.servicio.toLowerCase())}
          </Text>
        </Col>
        <Col span={4} align="right">
          <Button
            shape="round"
            type="danger"
            onClick={salir}
            style={{ marginTop: "10px" }}
          >
            <CloseCircleOutlined />
            {t("logout")}
          </Button>
        </Col>
      </Row>
      <Divider />
      <Row>
        <Col span={24}>
          {documents.length > 0 ? (
            <Table
              rowKey={"pt_no"}
              dataSource={filteredDocuments}
              pagination={false}
              columns={columns}
              rowClassName={getRowClassName}
            />
          ) : (
            <>
              <Text>{t("noData")}</Text>
            </>
          )}
        </Col>
      </Row>
    </>
  );
};
