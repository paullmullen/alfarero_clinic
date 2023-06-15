import React, { useEffect, useState } from "react";
import { Row, Col, Typography, Button, Divider, Table, Image, Alert, Switch, Select } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { useHideMenu } from "../hooks/useHideMenu";
import { getUsuarioStorage } from "../helpers/getUsuarioStorage";
import { Redirect, useHistory } from "react-router-dom";
import { firestore } from "./../helpers/firebaseConfig";
import StationEnum from "../helpers/stationEnum";

const { Title, Text } = Typography;
const { Option } = Select;

export const Escritorio = () => {
  const [documents, setDocuments] = useState([]);
  const [usuario] = useState(getUsuarioStorage());
  const history = useHistory();

  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const collectionRef = firestore.collection("patients");
      const snapshot = await collectionRef.orderBy("start_time", "asc").get();
      const initialData = snapshot.docs.map((doc) => doc.data());
  
      if (isMounted) {
        const filteredData = initialData.filter(
          (doc) => doc.plan_of_care.some((item) => item.station === usuario.servicio)
        );
        filteredData.sort((a, b) => a.start_time.toMillis() - b.start_time.toMillis());
        setDocuments(filteredData);
      }
  
      const unsubscribe = collectionRef.onSnapshot((snapshot) => {
        const updatedData = snapshot.docs.map((doc) => doc.data());
  
        if (isMounted) {
          const filteredData = updatedData.filter(
            (doc) => doc.plan_of_care.some((item) => item.station === usuario.servicio)
          );
          filteredData.sort((a, b) => a.start_time.toMillis() - b.start_time.toMillis());
          setDocuments(filteredData);
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

  const statusPaciente = (record) => {
    const currentStatus =
    record.plan_of_care.find((item) => item.station === usuario.servicio)
      ?.status || "";
  let statusIcon = null;

  switch (currentStatus) {
    case "waiting":
      statusIcon = (
        <Image src={require("../img/waiting.svg")} width={15} height={10} preview={false} />
      );
      break;
    case "in_process":
      statusIcon = (
        <Image src={require("../img/in_process.svg")} width={15} height={10} preview={false} />
      );
      break;
    case "complete":
      statusIcon = (
        <Image src={require("../img/complete.svg")} width={15} height={10}  preview={false}/>
      );
      break;
    default:
      statusIcon = null;
      break;
  }

  return statusIcon;
  }

  useHideMenu(false);

  if (!usuario.host || !usuario.servicio) {
    return <Redirect to="/ingresar-host" />;
  }
  
  const columns = [
    {
      title: "Nombre del paciente",
      dataIndex: "patient_name",
      key: "paciente",
    },
    {
      title: "Edad",
      dataIndex: "age",
      key: "edad",
    },
    {
      title: "Motivo de visita",
      dataIndex: "reason_for_visit",
      key: "sintomas",
    },
    {
      title: "Estatus vigente",
      dataIndex: "",
      key: "",
      render: (record) => statusPaciente(record),
      width: 100,
      align: 'center'
    },
    {
      title: "Actualizar estatus",
      dataIndex: "status",
      key: "status",
      width: 250,
      align: 'center',
      render: (text, record) => (
        <div className="center-cell">
          <Select
            value={record.status}
            onChange={(value) => handleStatusChange(record, value)}
            size="large"
            style={{ width: "100%" }} // Ajustar el ancho del Select al 100%
          >
            <Option value="waiting">En espera</Option>
            <Option value="in_process">Atendiendo</Option>
            <Option value="complete">Finalizado</Option>
          </Select>
        </div>
      ),
    },
  ];

  const handleStatusChange = (record, value) => {
    const updatedPlanOfCare = record.plan_of_care.map((item) => {
      if (item.station === usuario.servicio) {
        return {
          ...item,
          status: value,
        };
      }
      return item;
    });
  
    firestore.collection("patients").doc(record.pt_no).update({
      plan_of_care: updatedPlanOfCare,
    });
  };
  
  const getRowClassName = (record, index) => {
    return index % 2 === 0 ? "even-row" : "odd-row";
  };

  return (
    <>
      {visible && (
        <Alert
          message="Información del Estatus del Paciente"
          description={
            <>
              <p>
                <Image
                  src={require("../img/waiting.svg")}
                  width={15}
                  height={10}
                />
                {"En espera"}
              </p>
              <p>
                <Image
                  src={require("../img/in_process.svg")}
                  width={15}
                  height={10}
                />
                {"Paciente siendo atendido"}
              </p>
              <p>
                <Image
                  src={require("../img/complete.svg")}
                  width={15}
                  height={10}
                />
                {"El paciente finalizó su visita"}
              </p>
            </>
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
          <Text>Usted está ofreciendo el servicio: </Text>
          <Text type="success">{StationEnum[usuario.servicio]}</Text>
        </Col>
        <Col span={4} align="right">
          <Button
            shape="round"
            type="danger"
            onClick={salir}
            style={{ marginTop: "10px" }}
          >
            <CloseCircleOutlined />
            Salir
          </Button>
        </Col>
      </Row>
      <Divider />
      <Row>
        <Col span={24}>
          {documents.length > 0 ? (
            <Table
              rowKey={"pt_no"}
              dataSource={documents}
              columns={columns}
              rowClassName={getRowClassName}
            />
          ) : (
            <>
              <Text>No hay datos disponibles</Text>
              {console.log("No hay datos disponibles")}
            </>
          )}
        </Col>
      </Row>
    </>
  );
};
