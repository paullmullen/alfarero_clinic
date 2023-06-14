import React, { useEffect, useState } from "react";
import { Row, Col, Typography, Button, Divider, Table, Image, Alert, Switch, Radio, Modal } from "antd";
import { CloseCircleOutlined, RightOutlined } from "@ant-design/icons";
import { useHideMenu } from "../hooks/useHideMenu";
import { getUsuarioStorage } from "../helpers/getUsuarioStorage";
import { Redirect, useHistory } from "react-router-dom";
import { firestore } from "./../helpers/firebaseConfig";
import Input from "antd/lib/input/Input";

const { Title, Text } = Typography;

export const Escritorio = () => {
  const [documents, setDocuments] = useState([]);
  const [usuario] = useState(getUsuarioStorage());
  const history = useHistory();

  const [visible, setVisible] = useState(true);
  const [status, setStatus] = useState(1);
  const [editableData, setEditableData] = useState({});

  const handleClose = () => {
    setVisible(false);
  }

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const collectionRef = firestore.collection("patients");
      const snapshot = await collectionRef.get();
      const initialData = snapshot.docs.map((doc) => doc.data());

      if (isMounted) {
        const filteredData = initialData.filter(
          (doc) => doc.plan_of_care.some((item) => item.station === usuario.servicio)
        );
        setDocuments(filteredData);
      }

      const unsubscribe = collectionRef.onSnapshot((snapshot) => {
        const updatedData = snapshot.docs.map((doc) => doc.data());

        if (isMounted) {
          const filteredData = updatedData.filter(
            (doc) => doc.plan_of_care.some((item) => item.station === usuario.servicio)
          );
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

  const siguienteTicket = () => {
    console.log("siguienteTicket");
  };

  useHideMenu(false);

  if (!usuario.host || !usuario.servicio) {
    return <Redirect to="/ingresar-host" />;
  }

  const changeStatus = (e) => {
    console.log('radio checked', e.target.value);
    setStatus(e.target.value);
  };

  const warning = () => {
    Modal.warning({
      title: "¿Está seguro que desea cambiar el estatus?",
      content: (
        <div className="warning-content">
          <p>
            <Radio onChange={changeStatus} value={status} size="large"></Radio>
          </p>
          <p>
            <Radio onChange={changeStatus} value={status} size="large"></Radio>
          </p>
          <p>
            <Radio onChange={changeStatus} value={status} size="large"></Radio>
          </p>
          <p>
            <Radio onChange={changeStatus} value={status} size="large"></Radio>
          </p>
        </div>
      ),
    });
  };

  const handleCellEdit = (record, dataIndex) => {
    return {
      onChange: (e) => {
        const newData = { ...editableData };
        newData[record.key] = { ...newData[record.key] };
        newData[record.key][dataIndex] = e.target.value;
        setEditableData(newData);
      },
      onBlur: () => {
        const newData = { ...editableData };
        newData[record.key] = { ...newData[record.key] };
        newData[record.key][dataIndex] = editableData[record.key][dataIndex];
        setEditableData(newData);
      },
    };
  };
  
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
      title: "Numero telefonico",
      dataIndex: "tel",
      key: "edad",
    },
    {
      title: "Síntomas",
      dataIndex: "reason_for_visit",
      key: "sintomas",
    },
    {
      title: "Observaciones",
      dataIndex: "obs",
      key: "obs",
      render: (text, record) => (
        <Input
          value={editableData[record.key]?.obs || text}
          {...handleCellEdit(record, "observaciones")}
        />
      ),
    },
    {
      title: "Estatus del paciente",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: () => (
        <div className="center-cell">
          <Radio
            onClick={warning}
            onChange={changeStatus}
            value={status}
            size="large"
          ></Radio>
        </div>
      ),
    },
  ];
  
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
                  src={require("../img/not_planned.svg")}
                  width={15}
                  height={10}
                />
                {"Procesando información del paciente"}
              </p>
              <p>
                <Image
                  src={require("../img/waiting.svg")}
                  width={15}
                  height={10}
                />
                {"Paciente en espera"}
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
                {"El paciente completó su visita"}
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
            disabled={visible}
          ></Switch>
          <Divider />
          <Title level={2}>{usuario.host}</Title>
          <Text>Usted está ofreciendo el servicio: </Text>
          <Text type="success">{usuario.servicio}</Text>
        </Col>

        <Col span={4} align="right">
          <Button shape="round" type="danger" onClick={salir}>
            <CloseCircleOutlined />
            Salir
          </Button>
        </Col>
      </Row>

      <Divider />

      <Row>
        <Col>
          <Text>Atendiendo el paciente número: </Text>
          <Text style={{ fontSize: 30 }} type="danger">
            55
          </Text>
        </Col>
      </Row>

      <Row>
        <Col style={{ padding: 9 }} offset={18} span={6} align="right">
          <Button onClick={siguienteTicket} shape="round" type="primary">
            <RightOutlined />
            Siguiente
          </Button>
        </Col>
      </Row>
      <Divider />
      <Row>
      <Col span={24}>
        {documents.length > 0 ? (
          <Table
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
