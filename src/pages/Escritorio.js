import React, { useEffect, useState } from "react";
import { Row, Col, Typography, Button, Divider, Table, Image, Alert, Switch, Radio, Modal, Select } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, RightOutlined } from "@ant-design/icons";
import { useHideMenu } from "../hooks/useHideMenu";
import { getUsuarioStorage } from "../helpers/getUsuarioStorage";
import { Redirect, useHistory } from "react-router-dom";
import { firestore } from "./../helpers/firebaseConfig";
import Input from "antd/lib/input/Input";

const { Title, Text } = Typography;
const { Option } = Select;

export const Escritorio = () => {
  const [documents, setDocuments] = useState([]);
  const [usuario] = useState(getUsuarioStorage());
  const history = useHistory();

  const [visible, setVisible] = useState(true);
  const [status, setStatus] = useState(<CheckCircleOutlined />);
  const [editableData, setEditableData] = useState({});
  const [selectedIcon, setSelectedIcon] = useState("");

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

  const siguienteTicket = () => {
    console.log("siguienteTicket");
  };

  useHideMenu(false);

  if (!usuario.host || !usuario.servicio) {
    return <Redirect to="/ingresar-host" />;
  }

  const warning = (record) => {
  Modal.warning({
    title: "¿Está seguro que desea cambiar el estatus?",
    content: (
      <div className="warning-content">
        <p>
          <Radio
            onChange={() => setSelectedIcon("in_process")}
            checked={selectedIcon === "in_process"}
            value="in_process"
            size="large"
          />
          <Image
            src={require("../img/in_process.svg")}
            width={15}
            height={10}
          />
          {"Paciente siendo atendido"}
        </p>
        <p>
          <Radio
            onChange={() => setSelectedIcon("waiting")}
            checked={selectedIcon === "waiting"}
            value="waiting"
            size="large"
          />
          <Image
            src={require("../img/waiting.svg")}
            width={15}
            height={10}
          />
          {"Paciente en espera"}
        </p>
        <p>
          <Radio
            onChange={() => setSelectedIcon("complete")}
            checked={selectedIcon === "complete"}
            value="complete"
            size="large"
          />
          <Image
            src={require("../img/complete.svg")}
            width={15}
            height={10}
          />
          {"El paciente completó su visita"}
        </p>
        <p>
          <Radio
            onChange={() => setSelectedIcon("not_planned")}
            checked={selectedIcon === "not_planned"}
            value="not_planned"
            size="large"
          />
          <Image
            src={require("../img/not_planned.svg")}
            width={15}
            height={10}
          />
          {"Procesando información del paciente"}
        </p>
      </div>
    ),
    onOk: () => changeStatus(record),
  });
};

const changeStatus = (record) => {
  // Obtener el paciente seleccionado para modificar su estado
  const selectedPatient = documents.find(
    (doc) => doc.plan_of_care.some((item) => item.station === usuario.servicio)
  );

  // Validar que se haya seleccionado un icono
  if (selectedIcon) {
    const updatedPlanOfCare = selectedPatient.plan_of_care.map((item) => {
      if (item.station === usuario.servicio) {
        return {
          ...item,
          status: selectedIcon,
        };
      }
      return item;
    });

    // Actualizar el estado del paciente en Firestore
    firestore.collection("patients").doc(selectedPatient.pt_no).update({
      plan_of_care: updatedPlanOfCare,
    });
  }

  // Cerrar el modal
  handleClose();
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
      title: "Estatus actual",
      dataIndex: "",
      key: "",
      render: (text, record) => {
        let statusPhrase = "";
        const currentStatus = record.plan_of_care.find(item => item.station === usuario.servicio)?.status || '';
  
        switch (currentStatus) {
          case "in_process":
            statusPhrase = "Paciente siendo atendido";
            break;
          case "waiting":
            statusPhrase = "Paciente en espera";
            break;
          case "complete":
            statusPhrase = "El paciente completó su visita";
            break;
          case "not_planned":
            statusPhrase = "Procesando información del paciente";
            break;
          default:
            statusPhrase = "";
            break;
        }
  
        return <span>{statusPhrase}</span>;
      },
    },
    {
      title: "Estatus del paciente",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (text, record) => (
        <div className="center-cell">
          <Select
            value={record.status}
            onChange={(value) => handleStatusChange(record, value)}
            size="large"
          >
            <Option value="in_process">
              <Image
                src={require("../img/in_process.svg")}
                width={15}
                height={10}
              />
            </Option>
            <Option value="waiting">
              <Image
                src={require("../img/waiting.svg")}
                width={15}
                height={10}
              />
            </Option>
            <Option value="complete">
              <Image
                src={require("../img/complete.svg")}
                width={15}
                height={10}
              />
            </Option>
            <Option value="not_planned">
              <Image
                src={require("../img/not_planned.svg")}
                width={15}
                height={10}
              />
            </Option>
          </Select>
        </div>
      ),
    }
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
