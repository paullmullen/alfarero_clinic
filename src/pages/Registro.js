import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Divider,
  InputNumber,
  Select,
  Col,
  Row,
} from "antd";
import { SaveFilled } from "@ant-design/icons";
import { useHideMenu } from "../hooks/useHideMenu";
import { useAlert } from "../hooks/alert";
import { firestore } from "./../helpers/firebaseConfig";
import { checkDuplicateRecord } from "../helpers/checkDuplicateRecord";
import { stations } from "../helpers/stations";
import moment from "moment";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 14 },
};

const tailLayout = {
  wrapperCol: { offset: 8, span: 14 },
};

export const Registro = () => {
  const { showAlert } = useAlert();
  const [form] = Form.useForm();
  const [patientPlanOfCare, setPatientPlanOfCare] = useState([]);
  const [t] = useTranslation("global");



  useHideMenu(false);

  const statusList = ["waiting","2","3","4","5","6","7"];

  const fillMissingStations = (stations, visits) => {
    const result = [];
    const visitsSet = new Set(visits);

    let order = -1;

    // eslint-disable-next-line no-unused-expressions
    visits?.forEach((visit) => {
      const station = stations.find((s) => s.value === visit);
      if (station) {
        result.push({
          order: order++,
          station: station.value,
          status: statusList[order]
        });
      }
    });

    stations.forEach((station) => {
      if (!visitsSet.has(station.value)) {
        result.push({
          order: order++,
          station: station.value,
          status: "pending",
        });
      }
    });

    return result;
  };
  const generateVisits = (visits) => {
    const filledStations = fillMissingStations(stations, visits);
    setPatientPlanOfCare(filledStations);
  };

  const handleReset = () => {
    form.setFieldsValue({ stations: [] });
    form.resetFields();
  };

  const stationOptions = stations.map((station) => ({
    label: t(station.value),
    value: station.value,
  }));

  const updateStatsCollection = async (station) => {
    const currentDate = moment();
    const currentMonth = currentDate.month() + 1; // Obtener el número del mes actual
    const currentYear = currentDate.year();
    const currentMonthYear = `${currentMonth}/${currentYear}`;
    const statsRef = firestore.collection("stats").doc(station);

    // Obtener el documento de estadísticas de la estación actual
    const statsDoc = await statsRef.get();

    if (statsDoc.exists) {
      // El documento de estadísticas ya existe
      const statsData = statsDoc.data();

      if (statsData.date !== currentMonthYear) {
        // La fecha es diferente, crear un nuevo documento en la misma colección
        const newStatsRef = firestore.collection("stats").doc();
        const newStatsData = {
          station_type: statsData.station_type,
          number_of_patients: 1,
          date: currentMonthYear,
        };
        await newStatsRef.set(newStatsData);
      } else {
        // La fecha es la misma, actualizar el número de pacientes del mes actual
        const currentMonthPatients = statsData.number_of_patients || 0;
        await statsRef.update({
          number_of_patients: currentMonthPatients + 1,
        });
      }
    } else {
      // El documento de estadísticas no existe, crearlo con el número de pacientes del mes actual
      const statsData = {
        station_type: station,
        number_of_patients: 1,
        date: currentMonthYear,
      };
      await statsRef.set(statsData);
    }
  };

  const handleChange = (selectedOption) => {
    generateVisits(selectedOption);
  };

  const onFinish = async (patient) => {
    // const isDuplicate = await checkDuplicateRecord(
    //   "patients",
    //   "patient_name",
    //   patient.paciente
    // );
    // if (isDuplicate) {
    //   showAlert("Advertencia!", t("patientAlreadyExists"), "warning");
    //   return;
    // }
    const formattedPatient = {
      complete: false,
      last_update: new Date(),
      patient_name: patient.paciente,
      plan_of_care: patientPlanOfCare,
      pt_no: "",
      reason_for_visit: patient.motivo,
      age: patient.edad !== undefined ? patient.edad : null,
      tel: patient.tel ?? null,
      start_time: new Date(),
      stop_time: new Date(),
      wait_time: 0,
    };

    const patientRef = await firestore
      .collection("patients")
      .add(formattedPatient);
    const ptNo = patientRef.id;
    const updatedPatient = { ...formattedPatient, pt_no: ptNo };

    await patientRef.update(updatedPatient);

    // Actualizar el número de pacientes del mes actual en la colección "stats"
    const selectedStations = patientPlanOfCare.map((visit) => visit.station);
    selectedStations.forEach((station) => {
      updateStatsCollection(station);
    });

    showAlert("Success", t("patientWasCreated"), "success");
    handleReset();
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };

  // Renders the visible screen

  return (
    <Row gutter={24} style={{ display: "contents" }}>
      <Col xs={24} sm={24}>
        <Title level={2}>{t("patientRegistration")}</Title>
        <Text>{t("enterFields")}</Text>
        <Divider />
        <Form
          {...layout}
          form={form}
          name="basic"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          <Row gutter={24}>
            <Col xs={24} sm={24}>
              <Form.Item
                label={t("patientName")}
                name="paciente"
                rules={[{ required: true, message: t("enterName") }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col xs={24} sm={24}>
              <Form.Item
                label={t("age")}
                name="edad"
                rules={[
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === "") {
                        return Promise.resolve();
                      }
                      if (value >= 1 && value <= 99) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(t("enterValidAge")));
                    },
                  },
                ]}
              >
                <InputNumber min={1} max={99} />
              </Form.Item>

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
                      return Promise.reject(
                        new Error(t("enterValidPhoneNumber"))
                      );
                    },
                  },
                ]}
              >
                <Input type="tel" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
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
          <Row gutter={24}>
            <Col xs={24} sm={24}>
              <Form.Item
                label={t("stations")}
                name="estaciones"
                rules={[
                  {
                    required: true,
                    message: t("selectAstation"),
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  showArrow
                  style={{
                    width: "100%",
                  }}
                  options={stationOptions.slice(0)}
                  onChange={handleChange}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row style={{ display: "contents" }} gutter={24}>
            <Col xs={14} sm={24}>
              <Form.Item {...tailLayout}>
                <Button type="primary" htmlType="submit" shape="round">
                  <SaveFilled />
                  {t("register")}
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Col>
    </Row>
  );
};