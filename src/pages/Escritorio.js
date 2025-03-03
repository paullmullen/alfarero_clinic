import React, { useEffect, useState, useRef } from "react";
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
import { collection, onSnapshot } from "firebase/firestore"; // Import the necessary methods
import { fetchData } from "../helpers/fetchData";

import { CloseCircleOutlined } from "@ant-design/icons";
import { useHideMenu } from "../hooks/useHideMenu";
import { getUsuarioStorage } from "../helpers/getUsuarioStorage";
import { Redirect, useHistory } from "react-router-dom";
import { firestore } from "./../helpers/firebaseConfig";
// import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import pay from "../img/pay.svg";
import waiting from "../img/waiting.svg";
import in_process from "../img/in_process.svg";
import complete from "../img/complete.svg";
import fin from "../img/fin.png";
import { getTodayAndTomorrowTimestamps } from "../helpers/dateHelpers";
import {
  handleStatusChange,
  // handleDelete,
} from "./../helpers/updateStationStatus";

const { Title, Text } = Typography;
const { Option } = Select;
const { todayTimestamp, tomorrowTimestamp } = getTodayAndTomorrowTimestamps();

export const Escritorio = () => {
  const [usuario] = useState(getUsuarioStorage());
  const history = useHistory();
  const [patientsChanged, setPatientsChanged] = useState(true); // for a firestore listener that triggers a useEffect to reload the anfi table.
  const prevPatientsChangedRef = useRef(false); // Ref to store the previous value of patientsChanged.  the initial values of patientsChanged=true and ref=false will trigger the first render.
  const [data, setData] = useState([]);
  const [statsData, setStatsData] = useState([]);

  const [visible, setVisible] = useState(true);
  const [t] = useTranslation("global");

  const handleClose = () => {
    setVisible(false);
  };

  // Connects info to render on the app with firebase in real time (comunication react-firebase)

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
      console.log(statsData);
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        isMounted = false;
      };
    }
  }, [patientsChanged]);

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
          <Image src={waiting} width={15} height={10} preview={false} />
        );
        break;
      case "in_process":
        statusIcon = (
          <Image src={in_process} width={15} height={10} preview={false} />
        );
        break;
      case "complete":
        statusIcon = (
          <Image src={complete} width={15} height={10} preview={false} />
        );
        break;
      case "fin":
        statusIcon = <Image src={fin} width={20} height={15} preview={false} />;
        break;
      case "pay":
        statusIcon = <Image src={pay} width={15} height={10} preview={false} />;
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
      dataIndex: "age_group",
      key: "age_group",
      render: (text) => t(text), // Translate the stored value before displaying it
    },
    {
      title: t("gender"),
      dataIndex: "gender",
      key: "gender",
      render: (text) => t(text), // Translate the stored value before displaying it
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
            onChange={(value) => {
              console.log({ value, record });
              handleStatusChange(
                value,
                record.pt_no,
                usuario.servicio,
                t("complete")
              );
            }}
            size="large"
            style={{ width: "100%" }} // Ajustar el ancho del Select al 100%
          >
            <Option value="in_process">{t("beingAttended")}</Option>
            <Option value="waiting">{t("waiting")}</Option>
            <Option value="complete">{t("visitCompleted")}</Option>
          </Select>
        </div>
      ),
    },
    // {
    //   title: "",
    //   dataIndex: "complete",
    //   key: "estado",
    //   render: (complete, record) => (
    //     <Link
    //       to="#"
    //       onClick={() => handleCompleteChange(record)}
    //       style={{ color: complete ? "green" : "red", cursor: "pointer" }}
    //     >
    //       {complete ? "Completo" : "Eliminar"}
    //     </Link>
    //   ),
    // },
  ];

  // Functionality of changing and update status

  // const handleCompleteChange = (record) => {
  //   handleDelete(record, history);
  // };

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
                <Image src={waiting} width={15} height={10} />
                {t("waiting")}
              </div>
              <div>
                <Image src={in_process} width={15} height={10} />
                {t("beingAttended")}
              </div>
              <div>
                <Image src={complete} width={15} height={10} />
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
          {data.length > 0 ? (
            <Table
              rowKey={"pt_no"}
              dataSource={data}
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
