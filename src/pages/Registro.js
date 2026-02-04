/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Divider,
  Row,
  Col,
  Radio,
} from "antd";
import { SaveFilled } from "@ant-design/icons";
import { useHideMenu } from "../hooks/useHideMenu";
import { useAlert } from "../hooks/alert";
import {
  getDocs,
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "./../helpers/firebaseConfig";
// import { checkDuplicateRecord } from "../helpers/checkDuplicateRecord";
import { stations } from "../helpers/stations";
import moment from "moment";
import { useTranslation } from "react-i18next";
// import { QrReader } from "react-qr-reader";
import CryptoJS from "crypto-js";

const { Title, Text } = Typography;

const layout = {
  labelCol: { span: 8 },
};
const tailLayout = {
  wrapperCol: { offset: 8, span: 14 },
};

export const Registro = () => {
  const { showAlert } = useAlert();
  const [form] = Form.useForm();

  const ageGroup = Form.useWatch("age_group", form);
  const nationalIdValue = Form.useWatch("national_id_number", form);

  const showChildDpiWarning =
    ageGroup === "child" &&
    (nationalIdValue || "").replace(/\D/g, "").length > 0;

  const [patientPlanOfCare, setPatientPlanOfCare] = useState([]);
  const [recipes, setRecipes] = useState([]);
  // const [selectedRecipeStations, setRecipeStations] = useState([]);
  const [disabledButton, setDisabledButton] = useState(false);
  const [t] = useTranslation("global");

  // ------- QR (kept, still hidden/commented) -------
  const [scannerVisible, setScannerVisible] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);

  const getVideoDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput");
  };
  const handleToggleScanner = () => {
    setScannerVisible(!scannerVisible);
  };

  // Simple phone normalizer (keeps consistent with Settings.js import behavior)
  const normalizePhone = (raw) => {
    const digits = (raw ?? "").toString().replace(/\D/g, "");
    if (!digits) return null;
    if (digits.length === 8) return `502${digits}`; // local -> add country code
    if (digits.length === 11 && digits.startsWith("502")) {
      // already prefixed
      return digits;
    }
    // Otherwise keep cleaned digits (avoid guessing formats)
    return digits;
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
        {/* {scannerVisible && (
          <QrReader
            onError={handleError}
            onScan={handleScan}
            onResult={onResult}
            key={"environment"}
            constraints={{ facingMode: "environment" }}
          />
        )} */}
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

  // Make all unused stations equal to pending. This ensures that the pending stations
  // exists so that they could be changed by the host.
  const fillMissingStations = (stationsList, visits) => {
    const result = [];
    const visitsSet = new Set(visits);
    // The fixed order of stations
    const stationOrder = [
      "reg",
      "nur",
      "doc",
      "ped",
      "og",
      "lab",
      "pha",
      "pt",
      "den",
      "nut",
      "psi",
      "ora",
    ];
    let order = 0;
    // Iterate through the fixed order of stations
    stationOrder.forEach((stationValue) => {
      const station = stationsList.find((s) => s.value === stationValue);
      if (station) {
        if (visitsSet.has(stationValue)) {
          result.push({
            order: order++,
            station: station.value,
            status: statusList[order],
            ...(statusList[order] === "waiting" && {
              waiting_start: Timestamp.now(),
            }),
          });
        } else {
          result.push({
            order: order++,
            station: station.value,
            status: "pending",
          });
        }
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
    setKpLookup({ status: "idle", lastId: null }); // reset auto-fill note
  };

  useEffect(() => {
    let unsubscribe;
    const fetchData = async () => {
      try {
        const visitTypeRef = query(
          collection(firestore, "visit_types"),
          orderBy("order"),
        );
        const visitTypeSnapshot = await getDocs(visitTypeRef); // Use getDocs to fetch data
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
        // ---- sets up the options for the form ----
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

  const updateStatsCollection = async (station) => {
    const currentDate = moment();
    const currentMonth = currentDate.month() + 1; // Get the current month number
    const currentYear = currentDate.year();
    const currentDay = currentDate.toDate().getDate();
    const currentMonthDayYear = `${currentMonth}/${currentDay}/${currentYear}`;
    const statsRef = doc(firestore, "stats", station); // Use doc for referencing the stats document
    try {
      // Get the stats document from Firestore
      const statsDoc = await getDoc(statsRef);
      if (statsDoc.exists()) {
        const statsData = statsDoc.data();
        if (statsData.date !== currentMonthDayYear) {
          // If the date is different, reset the stats for all stations
          const statsCollectionRef = collection(firestore, "stats");
          const querySnapshot = await getDocs(statsCollectionRef);
          // Reset stats for all stations
          querySnapshot.forEach(async (doc) => {
            await updateDoc(doc.ref, {
              date: currentMonthDayYear,
              number_of_patients: 0,
              procedure_time_data: [],
              waiting_time_data: [],
              avg_procedure_time: 0,
              avg_waiting_time: 0,
            });
          });
        } else if (station === statsData.station_type) {
          // If the date is the same, update the number of patients for the current day
          const currentDayPatients = statsData.number_of_patients || 0;
          await updateDoc(statsRef, {
            number_of_patients: currentDayPatients + 1,
          });
        }
      } else {
        // If the stats document does not exist, create it with the number of patients for the current day
        const statsData = {
          station_type: station,
          number_of_patients: 1,
          date: currentMonthDayYear,
        };
        await setDoc(statsRef, statsData);
      }
    } catch (error) {
      console.log("Error updating stats collection:", error);
    }
  };

  // const handleChange = (selectedOption) => {
  //   generateVisits(selectedOption);
  // };

  const updateStations = (changedValues) => {
    let recipeOptions = [];
    if (Object.keys(changedValues)[0] === "tipo") {
      // only do this update if the type of visit value in the form changed
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
      secretPass,
    ).toString();
    return data;
  };
  const decryptData = (text) => {
    const bytes = CryptoJS.AES.decrypt(text, secretPass);
    const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return data;
  };

  // ----------------------------
  // Auto-fill from known_patients by DPI
  // ----------------------------
  const [kpLookup, setKpLookup] = useState({ status: "idle", lastId: null });
  const dpiDebounceRef = useRef(null);
  const toRawDpi = (val) =>
    (val || "").toString().replace(/\D/g, "").slice(0, 13);

  const fetchKnownPatient = async (rawId) => {
    setKpLookup({ status: "loading", lastId: rawId });
    try {
      const kpRef = doc(firestore, "known_patients", rawId);
      const kpSnap = await getDoc(kpRef);
      if (kpSnap.exists()) {
        const d = kpSnap.data() || {};
        form.setFieldsValue({
          paciente: d.patient_name ?? form.getFieldValue("paciente"),
          gender: d.gender ?? form.getFieldValue("gender"),
          age_group: d.age_group ?? form.getFieldValue("age_group"),
          tel: d.telephone_number ?? form.getFieldValue("tel"),
        });
        setKpLookup({ status: "found", lastId: rawId });
      } else {
        setKpLookup({ status: "not_found", lastId: rawId });
      }
    } catch (err) {
      console.error("known_patients lookup error:", err);
      setKpLookup({ status: "error", lastId: rawId });
    }
  };

  const maybeAutofillFromDpi = (rawId) => {
    if (dpiDebounceRef.current) clearTimeout(dpiDebounceRef.current);
    if (rawId && rawId.length === 13) {
      dpiDebounceRef.current = setTimeout(() => fetchKnownPatient(rawId), 300);
    } else {
      setKpLookup({ status: "idle", lastId: null });
    }
  };

  const onFinish = async (patient) => {
    setDisabledButton(true);

    // Always store ONLY digits (no spaces)
    const nationalId = patient.national_id_number
      ? patient.national_id_number.replace(/\D/g, "")
      : null;

    const normalizedTel = normalizePhone(patient.tel);

    // Determine if this is a new patient based on the last DPI lookup result
    // If lookup found a match => new_patient = false; else true
    // When no DPI is provided, treat as new (true).
    const isNewPatient = kpLookup?.status === "found" ? false : true;

    const formattedPatient = {
      complete: false,
      last_update: Timestamp.now(),
      patient_name: patient.paciente,
      plan_of_care: patientPlanOfCare,
      pt_no: "",
      reason_for_visit: patient.motivo,
      tel: normalizedTel ?? null,
      start_time: Timestamp.now(),
      stop_time: Timestamp.now(),
      waiting_time: 0,
      type_of_visit: patient.tipo,
      gender: patient.gender,
      age_group: patient.age_group !== undefined ? patient.age_group : null,
      national_id_number: nationalId,
      new_patient: isNewPatient,
    };

    try {
      // 1) Create the patient document
      const patientRef = await addDoc(
        collection(firestore, "patients"),
        formattedPatient,
      );
      const ptNo = patientRef.id;

      // 2) Update with its doc id (pt_no)
      const updatedPatient = { ...formattedPatient, pt_no: ptNo };
      await updateDoc(doc(firestore, "patients", ptNo), updatedPatient);

      // 3) Maintain stats for each scheduled (non-pending) station
      const selectedStations = patientPlanOfCare.map((visit) => ({
        station: visit.station,
        status: visit.status,
      }));
      selectedStations.forEach((station) => {
        if (station.status !== "pending") {
          updateStatsCollection(station.station);
        }
      });

      // 4) Maintain the known_patients collection keyed by national_id_number
      if (nationalId) {
        const kpRef = doc(firestore, "known_patients", nationalId);
        const kpSnap = await getDoc(kpRef);

        if (!kpSnap.exists()) {
          // Create a new record for first-time national ID
          await setDoc(kpRef, {
            national_id_number: nationalId,
            patient_name: patient.paciente || null,
            gender: patient.gender ?? null,
            age_group: patient.age_group ?? null,
            is_new: true,
            created_at: Timestamp.now(),
            tel: normalizedTel ?? kpSnap.data().telephone_number ?? null,
            last_seen_at: Timestamp.now(),
            last_patient_doc_id: ptNo,
          });
        } else {
          // Update last_seen (do not overwrite is_new intentionally)
          await updateDoc(kpRef, {
            patient_name:
              patient.paciente || kpSnap.data().patient_name || null,
            gender: patient.gender ?? kpSnap.data().gender ?? null,
            age_group: patient.age_group ?? kpSnap.data().age_group ?? null,
            last_seen_at: Timestamp.now(),
            last_patient_doc_id: ptNo,
          });
        }
      }

      // demo crypto (kept from your code)
      const fooJson = {
        n: "Paul Mullen",
        t: "Lawrence",
      };
      const fooString = JSON.stringify(fooJson);
      const foo = encryptData(fooString);

      showAlert("Success", t("patientWasCreated"), "success");
      handleReset();
    } catch (error) {
      console.log("Error creating/updating patient: ", error);
      showAlert("Error", t("somethingWentWrong"), "error");
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Form incomplete:", errorInfo);
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

          {/* Patient Name */}
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

          {/* National ID Number (DPI) with auto-format + auto-fill */}
          <Row style={{ display: "contents" }} gutter={24}>
            <Col xs={24} sm={24}>
              <Form.Item
                label={t("NATIONAL_ID_NUMBER") || "National ID Number"}
                name="national_id_number"
                rules={[
                  {
                    required: false,
                  },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const raw = (value || "").replace(/\D/g, "");
                      if (raw.length === 13) return Promise.resolve();
                      return Promise.reject(
                        new Error(t("ENTER_VALID_NATIONAL_ID")),
                      );
                    },
                  },
                ]}
              >
                <Input
                  maxLength={17} // 4 + 1 + 5 + 1 + 4
                  onChange={(e) => {
                    let v = e.target.value || "";
                    // Remove non-digits, cap at 13
                    v = v.replace(/\D/g, "").slice(0, 13);
                    // Apply #### ##### ####
                    let formatted = v;
                    if (v.length > 4) {
                      formatted = v.slice(0, 4) + " " + v.slice(4);
                    }
                    if (v.length > 9) {
                      formatted =
                        v.slice(0, 4) +
                        " " +
                        v.slice(4, 9) +
                        " " +
                        v.slice(9, 13);
                    }
                    form.setFieldsValue({ national_id_number: formatted });

                    // Trigger auto-fill if 13 digits
                    const raw = toRawDpi(formatted);
                    maybeAutofillFromDpi(raw);

                    // Keep caret at end (helps on paste/typing)
                    setTimeout(() => {
                      const el = e.target;
                      if (el && typeof el.setSelectionRange === "function") {
                        const end = formatted.length;
                        el.setSelectionRange(end, end);
                      }
                    }, 0);
                  }}
                  onPaste={(e) => {
                    const pasted = (e.clipboardData?.getData("text") || "")
                      .replace(/\D/g, "")
                      .slice(0, 13);
                    if (pasted) {
                      e.preventDefault();
                      let formatted = pasted;
                      if (pasted.length > 4) {
                        formatted = pasted.slice(0, 4) + " " + pasted.slice(4);
                      }
                      if (pasted.length > 9) {
                        formatted =
                          pasted.slice(0, 4) +
                          " " +
                          pasted.slice(4, 9) +
                          " " +
                          pasted.slice(9, 13);
                      }
                      form.setFieldsValue({ national_id_number: formatted });
                      maybeAutofillFromDpi(pasted);
                    }
                  }}
                />
              </Form.Item>
              {showChildDpiWarning && (
                <Text type="warning">
                  {t("CHILD_DPI_WARNING") ||
                    "Child selected: if this is the parent’s National ID, leave this blank or enter the child’s ID."}
                  <br />
                </Text>
              )}

              {/* Inline feedback for auto-fill */}
              {kpLookup.status === "loading" && (
                <Text type="secondary">{t("searching") || "Searching..."}</Text>
              )}
              {kpLookup.status === "found" && (
                <Text type="success">
                  {t("KNOWNPATIENTFOUND") ||
                    "Known patient found. Name, gender, and age group auto-filled."}
                </Text>
              )}
              {kpLookup.status === "not_found" && (
                <Text type="secondary">
                  {t("NOKNOWNPATIENT") || "No matching known patient."}
                </Text>
              )}
              {kpLookup.status === "error" && (
                <Text type="danger">
                  {t("LOOKUPERROR") || "There was an error looking up the ID."}
                </Text>
              )}
            </Col>
          </Row>

          {/* Age Group */}
          <Row>
            <Col xs={8} sm={8}></Col>
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
                    value="child"
                    style={{ flex: `0 0 ${12}%` }}
                  >
                    {t("child")}
                  </Radio>
                  <Radio
                    key="adult"
                    value="adult"
                    style={{ flex: `0 0 ${12}%` }}
                  >
                    {t("adult")}
                  </Radio>
                </Radio.Group>
              </Form.Item>
            </Col>

            {/* Gender */}
            <Col xs={8} sm={8}>
              <Form.Item
                label={t("gender")}
                name="gender"
                rules={[
                  {
                    required: true,
                    message: t("selectPatientGender"),
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
                    value="masculine"
                    style={{ flex: `0 0 ${12}%` }}
                  >
                    {t("male")}
                  </Radio>
                  <Radio
                    key="feminine"
                    value="feminine"
                    style={{ flex: `0 0 ${12}%` }}
                  >
                    {t("female")}
                  </Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          {/* Phone */}
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
                        /^(\+\d{1,3}[- *])?\(?([0-9]{3,4})\)?[-.● *]?([0-9]{3,4})[-.● *]?([0-9]{3,4})?$/.test(
                          value,
                        )
                      ) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(t("enterValidPhoneNumber")),
                      );
                    },
                  },
                ]}
              >
                <Input type="tel" />
              </Form.Item>
            </Col>
          </Row>

          {/* Reason */}
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

          {/* Visit types */}
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

          {/* Submit */}
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
        </Form>
      </Col>
    </Row>
  );
};

export default Registro;
