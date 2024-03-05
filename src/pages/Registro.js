import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Divider,
  Col,
  Row,
  Radio,
} from "antd";
import { SaveFilled } from "@ant-design/icons";
import { useHideMenu } from "../hooks/useHideMenu";
import { useAlert } from "../hooks/alert";
import { firestore } from "./../helpers/firebaseConfig";
// import { checkDuplicateRecord } from "../helpers/checkDuplicateRecord";
import { stations } from "../helpers/stations";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { QrReader } from "react-qr-reader";
import CryptoJS from "crypto-js";

const { Title } = Typography;

const layout = {
  labelCol: { span: 8 },
};

const tailLayout = {
  wrapperCol: { offset: 8, span: 14 },
};

export const Registro = () => {
  const { showAlert } = useAlert();
  const [form] = Form.useForm();
  const [patientPlanOfCare, setPatientPlanOfCare] = useState([]);
  const [recipes, setRecipes] = useState([]);
  // const [selectedRecipeStations, setRecipeStations] = useState([]);
  const [disabledButton, setDisabledButton] = useState(false);
  const [t] = useTranslation("global");

  const [scannerVisible, setScannerVisible] = useState(false); // Define scannerVisible for Registro component
  const [qrCodeData, setQrCodeData] = useState(null); // Define qrCodeData for Registro component

  const getVideoDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log(devices);
    return devices.filter((device) => device.kind === "videoinput");
  };

  const handleToggleScanner = () => {
    setScannerVisible(!scannerVisible);
  };

  const onResult = (data) => {
    if (data) {
      handleToggleScanner();
      const decrypt = decryptData(data.text);
      const temp = JSON.parse(decrypt);

      if (temp.n) {
        form.setFieldsValue({
          paciente: temp.n,
        });
      }
      if (temp.t) {
        form.setFieldsValue({
          tel: temp.t,
        });
      }
    }
  };

  const handleScan = (data) => {
    if (data) {
      setQrCodeData(data);
    }
  };

  const handleError = (error) => {
    console.error(error);
  };

  const QRCodeScanner = () => {
    return (
      <div>
        {scannerVisible && (
          <QrReader
            onError={handleError}
            onScan={handleScan}
            onResult={onResult}
            key={"environment"}
            constraints={{ facingMode: "environment" }}
          />
        )}
      </div>
    );
  };

  useHideMenu(false);

  const statusList = [
    "waiting",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
  ];

  // Make all unused stations equal to pending.  This ensures that the pending stations exists so that they could be changed by the host.
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
          status: statusList[order],
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

  // Reset the form after successful entry to make room for the next new patient.
  const handleReset = () => {
    form.setFieldsValue({ stations: [] });
    form.resetFields();
    setDisabledButton(false);
  };

  useEffect(() => {
    console.log(getVideoDevices());


    let unsubscribe;

    const fetchData = async () => {
      try {
        const visitTypeRef = firestore
          .collection("visit_types")
          .orderBy("order");
        const visitTypeSnapshot = await visitTypeRef.get();
        const visitRecipes = visitTypeSnapshot.docs.map((doc) => {
          return doc.data();
        });
        let recipes = [];
        visitRecipes.forEach((item) => {
          recipes.push({
            value: item.name,
            label: t(item.name),
            stations: item.plan_of_care,
          });
        });
        //---- sets up the options for the form ----
        setRecipes(recipes);
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [t]);

  //Called by OnFinish and by the onValuesChange elmement of the form.
  const updateStatsCollection = async (station) => {
    const currentDate = moment();
    const currentMonth = currentDate.month() + 1; // Obtener el número del mes actual
    const currentYear = currentDate.year();
    const currentDay = currentDate.toDate().getDate();
    const currentMonthDayYear = `${currentMonth}/${currentDay}/${currentYear}`;
    const statsRef = firestore.collection("stats").doc(station);

    // Obtener el documento de estadísticas de la estación actual
    let statsDoc = await statsRef.get();
    if (statsDoc.exists) {
      // El documento de estadísticas ya existe
      const statsData = statsDoc.data();
      if (statsData.date !== currentMonthDayYear) {
        // La fecha es diferente, reset the stats for all stations
        try {
          firestore
            .collection("stats")
            .get()
            .then(function (querySnapshot) {
              querySnapshot.forEach(function (doc) {
                doc.ref.update({
                  date: currentMonthDayYear,
                  number_of_patients: 0,
                  procedure_time_data: [],
                  waiting_time_data: [],
                  avg_procedure_time: 0,
                  avg_waiting_time: 0,
                });
              });
            });
        } catch (e) {
          console.log(e);
        }
      }
      // La fecha es la misma, actualizar el número de pacientes del dia actual
      else if (station === statsDoc.data().station_type) {
        const currentDayPatients = statsData.number_of_patients || 0;
        await statsRef.update({
          number_of_patients: currentDayPatients + 1,
        });
      }
    } else {
      // El documento de estadísticas no existe, crearlo con el número de pacientes del mes actual
      const statsData = {
        station_type: station,
        number_of_patients: 1,
        date: currentMonthDayYear,
      };
      await statsRef.set(statsData);
    }
  };

  // const handleChange = (selectedOption) => {
  //   generateVisits(selectedOption);
  // };

  const updateStations = (changedValues) => {
    let recipeOptions = [];
    if (Object.keys(changedValues)[0] === "tipo") {
      // only do this update if the type of visit value in the form changed, otherwise, nothing to do.
      let whichRecipe = null;
      recipes.forEach((element, index) => {
        if (element.value === changedValues.tipo) {
          whichRecipe = index;
        }
      });
      recipes[whichRecipe].stations.forEach((item) => {
        recipeOptions.push({ value: item, label: t(item) });
      });
      form.setFieldsValue({ estaciones: recipeOptions });
      let updateArray = [];
      recipeOptions.forEach((e) => {
        updateArray.push(e.value);
      });
      generateVisits(updateArray);
    }
  };

  const secretPass = "XkhZG4fW2t2W";

  const encryptData = (text) => {
    const data = CryptoJS.AES.encrypt(
      JSON.stringify(text),
      secretPass
    ).toString();

    return data;
  };

  const decryptData = (text) => {
    const bytes = CryptoJS.AES.decrypt(text, secretPass);
    const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return data;
  };

  const onFinish = async (patient) => {
    setDisabledButton(true);
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
      type_of_visit: patient.tipo,
      gender: patient.gender,
      age_group: patient.age_group !== undefined ? patient.age_group : null
    };
    console.log(formattedPatient);
    const patientRef = await firestore
      .collection("patients")
      .add(formattedPatient);
    const ptNo = patientRef.id;
    const updatedPatient = { ...formattedPatient, pt_no: ptNo };

    await patientRef.update(updatedPatient);

    // Actualizar el número de pacientes del mes actual en la colección "stats"
    const selectedStations = patientPlanOfCare.map((visit) => {
      return {
        station: visit.station,
        status: visit.status,
      };
    });
    selectedStations.forEach((station) => {
      // only count scheduled stations... pending is not a planned station.
      if (station.status !== "pending") {
        updateStatsCollection(station.station);
      }
    });

    console.log("patient: ", patient.paciente);
    const fooJson = {
      n: "Paul Mullen",
      t: "Lawrence",
    };
    const fooString = JSON.stringify(fooJson);

    const foo = encryptData(fooString);
    console.log("encrypted: ", foo);
    console.log("decrypted: ", decryptData(foo, secretPass));

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
        <Divider />
        <Form
          {...layout}
          form={form}
          name="basic"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          onValuesChange={updateStations}
        >
          <Row gutter={24}>
            <Col xs={4} sm={4}>
              <Button onClick={handleToggleScanner} shape="round">
                {t("SCAN")}
              </Button>
            </Col>
            <Col xs={8} sm={8}>
              {scannerVisible && (
                <QRCodeScanner
                  scannerVisible={scannerVisible}
                  setScannerVisible={setScannerVisible}
                  qrCodeData={qrCodeData}
                  setQrCodeData={setQrCodeData}
                />
              )}
            </Col>
          </Row>
          <Row> 
            <Col xs={24} sm={24}>

              <Row>
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

              <Row >
              <Col xs={8} sm={8}>  
                </Col>
                <Col xs={7} sm={7}>
                  <Form.Item
                    label={t("age")}
                    name="age_group"
                    rules={[
                      {
                        required: true,
                        message: t("selectPatientAge"),
                      },
                    ]}
                  >
                    <Radio.Group
                      size="large"
                      optionType="button"
                      style={{ display: "flex", flexWrap: "wrap" }}
                    >
                      <Radio
                        key="child"
                        value = "child"
                        style={{ flex: `0 0 ${12}%` }}
                      >{t("child")}</Radio>
                      <Radio
                        key="adult"
                        value="adult"
                        style={{ flex: `0 0 ${12}%` }}
                      >{t("adult")}</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col xs={8} sm={8}>
                  <Form.Item
                    label={t("gender")}
                    name="gender"
                    rules={[
                      {
                        required: true,
                        message: t("selectPatientAge"),
                      },
                    ]}
                  >
                    <Radio.Group
                      size="large"
                      optionType="button"
                      style={{ display: "flex", flexWrap: "wrap" }}
                    >
                      <Radio
                        key="masculine"
                        value = "masculine"
                        style={{ flex: `0 0 ${12}%` }}
                      >{t("male")}</Radio>
                      <Radio
                        key="feminine"
                        value="feminine"
                        style={{ flex: `0 0 ${12}%` }}
                      >{t("female")}
                      </Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              <Row style={{ display: "contents" }} gutter={24}>
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
              <Row>
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
                    label={t("visitTypes")}
                    name="tipo"
                    rules={[
                      {
                        required: true,
                        message: t("selectExamType"),
                      },
                    ]}
                  >
                    <Radio.Group
                      onChange={updateStations}
                      size="large"
                      optionType="button"
                      style={{ display: "flex", flexWrap: "wrap" }}
                    >
                      {recipes.map((recipe) => (
                        <Radio
                          key={recipe.value}
                          value={recipe.value}
                          style={{ flex: `0 0 ${33}%` }}
                        >
                          {recipe.label}
                        </Radio>
                      ))}
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              {/* <Row gutter={24}>
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
                  options={stationOptions}
                  onChange={handleChange}
                />
              </Form.Item>
            </Col>
          </Row> */}
              <Row>
                <Col xs={24} sm={24}>
                  <Form.Item {...tailLayout}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      shape="round"
                      name="register"
                      disabled={disabledButton}
                    >
                      <SaveFilled />
                      {t("register")}
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Row>
        </Form>
      </Col>
    </Row>
  );
};
