import React, { useEffect, useState } from "react";
import { Table, Image, Alert, Divider, Radio } from "antd";
import { firestore } from "./../helpers/firebaseConfig";
import { useHideMenu } from "../hooks/useHideMenu";

export const Turno = () => {
  useHideMenu(true);
  const [data, setData] = useState([]);
  const [status, setStatus] = useState(1);

  console.log(data);
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const collectionRef = firestore.collection("patients");
      const snapshot = await collectionRef.get();
      const initialData = snapshot.docs.map((doc) => {
        return doc.data();
      });

      if (isMounted) {
        setData(initialData);
      }
      const unsubscribe = collectionRef.onSnapshot((snapshot) => {
        const updatedData = snapshot.docs.map((doc) => doc.data());

        if (isMounted) {
          setData(updatedData);
        }
      });

      return () => {
        unsubscribe();
        isMounted = false;
      };
    };

    fetchData();
  }, []);

  const changeStatus = (e) => {
    console.log('radio checked', e.target.value);
    setStatus(e.target.value);
  };
  

  const columns = [
    {
      title: "Paciente",
      dataIndex: "paciente", // Nuevo campo: Paciente
      key: "11",
      width: 110,
    },
    {
      title: "Médico General",
      dataIndex: "med",
      key: "1",
      width: 40,
      render: () => (
        <div className="center-cell">
          <Radio onChange={changeStatus} value={1} size="large"></Radio>{" "}
        </div>
      ),
    },
    {
      title: "Enfermería",
      dataIndex: "enf",
      key: "2",
      width: 50,
      render: () => (
        <div className="center-cell">
          <Radio onChange={changeStatus} value={1} size="large"></Radio>{" "}
        </div>
      ),
    },
    {
      title: "Laboratorio",
      dataIndex: "lab",
      key: "3",
      width: 50,
      render: () => (
        <div className="center-cell">
          <Radio onChange={changeStatus} value={1} size="large"></Radio>{" "}
        </div>
      ),
    },
    {
      title: "Fisiólogo",
      dataIndex: "fis",
      key: "4",
      width: 40,
      render: () => (
        <div className="center-cell">
          <Radio onChange={changeStatus} value={1} size="large"></Radio>{" "}
        </div>
      ),
    },
    {
      title: "Pediatra",
      dataIndex: "ped",
      key: "5",
      width: 40,
      render: () => (
        <div className="center-cell">
          <Radio onChange={changeStatus} value={1} size="large"></Radio>{" "}
        </div>
      ),
    },
    {
      title: "Nutriólogo",
      dataIndex: "nut",
      key: "6",
      width: 40,
      render: () => (
        <div className="center-cell">
          <Radio onChange={changeStatus} value={1} size="large"></Radio>{" "}
        </div>
      ),
    },
    {
      title: "Obstétrico",
      dataIndex: "obs",
      key: "7",
      width: 40,
      render: () => (
        <div className="center-cell">
          <Radio onChange={changeStatus} value={1} size="large"></Radio>{" "}
        </div>
      ),
    },
    {
      title: "Neurólogo",
      dataIndex: "neu",
      key: "9",
      width: 40,
      render: () => (
        <div className="center-cell">
          <Radio onChange={changeStatus} value={1} size="large"></Radio>{" "}
        </div>
      ),
    },
    {
      title: "Tiempo",
      dataIndex: "tiempo", // Nuevo campo: Timestamp
      key: "14",
      width: 50,
    },
  ];

  const getRowClassName = (record, index) => {
    return index % 2 === 0 ? "even-row" : "odd-row";
  };

  return (
    <>
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
      />
      <Divider />
      <Table
        rowKey={"paciente"}
        columns={columns}
        dataSource={data.some((d) => d === undefined) ? [] : data}
        scroll={{ x: 1500, y: 1500 }}
        sticky
        offsetScroll={3}
        rowClassName={getRowClassName}
      />
    </>
  );
};
