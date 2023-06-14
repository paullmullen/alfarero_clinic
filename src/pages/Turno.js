import React, { useEffect, useState } from "react";
import { Table, Image, Alert, Divider, Typography, Space } from "antd";
import { firestore } from "./../helpers/firebaseConfig";
import { useHideMenu } from "../hooks/useHideMenu";
import StationEnum from "../helpers/stationEnum";
const { Title } = Typography;

export const Turno = () => {
  useHideMenu(true);
  const [data, setData] = useState([]);

  const renderStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return (
          <Image
            src={require("../img/not_planned.svg")}
            width={20}
            height={80}
          />
        );
      case "in_process":
        return (
          <Image src={require("../img/waiting.svg")} width={20} height={80} />
        );
      case "waiting":
        return (
          <Image src={require("../img/waiting.svg")} width={20} height={80} />
        );
      case "pay":
        return <Image src={require("../img/pay.svg")} width={20} height={80} />;
      case "complete":
        return (
          <Image src={require("../img/complete.svg")} width={20} height={80} />
        );
      default:
        return (
          <Image
            src={require("../img/not_planned.svg")}
            width={20}
            height={80}
          />
        );
    }
  };

  const generateTableData = (extractedPlanOfCare) => {
    const uniqueStations = {};
    extractedPlanOfCare.forEach((item) => {
      // eslint-disable-next-line no-unused-expressions
      item.plan_of_care?.forEach((plan) => {
        if (!uniqueStations[plan.station]) {
          uniqueStations[plan.station] = {
            dataIndex: plan.station,
            key: plan.station,
            title: StationEnum[plan.station],
            render: (status) => renderStatusIcon(status),
            width: 100,
            align: "center",
          };
        }
      });
    });
    const columns = [
      {
        title: "Patient",
        dataIndex: "patient_name",
        key: "patient",
        width: 100,
        fixed: "left",
      },
      ...Object.values(uniqueStations),
      {
        title: "Tiempo de espera",
        dataIndex: "",
        key: "",
        width: 100,
        fixed: "right",
      },
    ];

    const dataSource = extractedPlanOfCare.map((item) => {
      const stations = {};
      item.plan_of_care.forEach((plan) => {
        stations[plan.station] = plan.status;
      });
      return {
        pt_no: item.pt_no,
        patient_name: item.patient_name,
        ...stations,
      };
    });

    return { columns, dataSource };
  };

  const { columns, dataSource } = generateTableData(data);

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

  const getRowClassName = (record, index) => {
    return index % 2 === 0 ? "even-row" : "odd-row";
  };

  return (
    <>
      <Alert
        message="Información del Estatus del Paciente "
        description={
          <Space
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <Space>
              <Image
                src={require("../img/waiting.svg")}
                width={20}
                height={80}
              />
              <Title level={5}>{"Paciente en espera "}</Title>
            </Space>
            <Divider />
            <Space>
              <Image
                src={require("../img/in_process.svg")}
                width={20}
                height={80}
              />
              <Title level={5}>{"Paciente siendo atendido "}</Title>
            </Space>
            <Divider />
            <Space>
              <Image src={require("../img/pay.svg")} width={20} height={80} />
              <Title level={5}> {"Paciente realizó el pago "}</Title>
            </Space>
            <Divider />
            <Space>
              <Image
                src={require("../img/complete.svg")}
                width={20}
                height={80}
              />
              <Title level={5}> {"Paciente completó su visita "}</Title>
            </Space>
          </Space>
        }
        type="info"
        showIcon
      />

      <Divider />
      <Table
        rowKey={"pt_no"}
        columns={columns}
        dataSource={data.some((d) => d === undefined) ? [] : dataSource}
        scroll={{ x: 1500, y: 1500 }}
        sticky
        offsetScroll={3}
        rowClassName={getRowClassName}
      />
    </>
  );
};
