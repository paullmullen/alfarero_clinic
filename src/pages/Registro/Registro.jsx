/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Divider,
  Row,
  Col,
  Radio,
  Select,
} from "antd";
import { SaveFilled } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import { useHideMenu } from "../../hooks/useHideMenu";
import { useAlert } from "../../hooks/alert";
import { firestore } from "../../helpers/firebaseConfig";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { stations } from "../../helpers/stations";
import { useServiceLocation } from "../../providers/ServiceLocationProvider";

import { useVisitTypes } from "./hooks/useVisitTypes";
import { useKnownPatientAutofill } from "./hooks/useKnownPatientAutofill";

import { normalizePhone } from "./utils/phone";
import { toRawDpi, formatDpi } from "./utils/dpi";
import { buildPlanOfCare } from "./utils/planOfCare";

import {
  buildFormattedPatient,
  createPatientDoc,
} from "./services/patientsService";
import { updateStatsCollection } from "./services/statsService";
import { upsertKnownPatient } from "./services/knownPatientsService";

import TicketPrint from "../../components/printing/TicketPrint";
import { printPatientTicket } from "../../components/printing/printPatientTicket";

const { Title, Text } = Typography;

const layout = { labelCol: { span: 8 } };
const tailLayout = { wrapperCol: { offset: 8, span: 14 } };

export const Registro = () => {
  const { selectedLocation } = useServiceLocation();

  useHideMenu(false);

  const { showAlert } = useAlert();
  const [form] = Form.useForm();
  const [t] = useTranslation("global");

  const { locations, locationId } = useServiceLocation();

  const ticketPrintRef = useRef(null);
  const [ticketPatient, setTicketPatient] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  // Only used when global location is "__ALL__"
  const [registroLocationId, setRegistroLocationId] = useState(null);
  const needsClinicPick = locationId === "__ALL__";
  const effectiveLocationId = needsClinicPick ? registroLocationId : locationId;

  const effectiveLocation = useMemo(() => {
    if (!effectiveLocationId || effectiveLocationId === "__ALL__") return null;
    return locations.find((l) => l.id === effectiveLocationId) || null;
  }, [locations, effectiveLocationId]);

  const effectiveLocationName = effectiveLocation?.name || null;
  const effectiveLocationMessage = effectiveLocation?.message || null;

  const canSubmit =
    !needsClinicPick ||
    (effectiveLocationId && effectiveLocationId !== "__ALL__");

  // watchers
  const ageGroup = Form.useWatch("age_group", form);
  const nationalIdValue = Form.useWatch("national_id_number", form);
  const showChildDpiWarning =
    ageGroup === "child" &&
    (nationalIdValue || "").replace(/\D/g, "").length > 0;

  const { recipes } = useVisitTypes({ firestore, t });

  const { kpLookup, maybeAutofillFromDpi, resetLookup } =
    useKnownPatientAutofill({
      firestore,
      form,
    });

  const [patientPlanOfCare, setPatientPlanOfCare] = useState([]);
  const [disabledButton, setDisabledButton] = useState(false);

  useEffect(() => {
    if (ageGroup !== "child") {
      form.setFieldValue("guardian_name", undefined);
    }
  }, [ageGroup, form]);

  useEffect(() => {
    const loadOrganizations = async () => {
      const q = query(
        collection(firestore, "organizations"),
        where("active", "==", true),
        orderBy("order", "asc"),
        orderBy("name", "asc"),
      );

      const snap = await getDocs(q);

      setOrganizations(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      );
    };

    loadOrganizations();
  }, []);

  const handleReset = () => {
    form.setFieldsValue({ stations: [], guardian_name: undefined });
    form.resetFields();
    setDisabledButton(false);
    resetLookup();
    setRegistroLocationId(null);
    setPatientPlanOfCare([]);
    setTicketPatient(null);
  };

  const updateStations = (changedValues) => {
    if (Object.keys(changedValues)[0] !== "tipo") return;

    const selected = recipes.find((r) => r.value === changedValues.tipo);
    if (!selected) return;

    const recipeOptions = (selected.stations || []).map((item) => ({
      value: item,
      label: t(item),
    }));

    form.setFieldsValue({ estaciones: recipeOptions });

    const visits = recipeOptions.map((x) => x.value);
    const plan = buildPlanOfCare(stations, visits);
    setPatientPlanOfCare(plan);
  };

  const printTicketNode = (node) => {
    return new Promise((resolve, reject) => {
      if (!node) {
        reject(new Error("No printable node found."));
        return;
      }

      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) {
        reject(new Error("Popup blocked."));
        return;
      }

      const styles = Array.from(
        document.querySelectorAll("link[rel='stylesheet'], style"),
      )
        .map((el) => el.outerHTML)
        .join("\n");

      const clone = node.cloneNode(true);

      const originalCanvases = node.querySelectorAll("canvas");
      const clonedCanvases = clone.querySelectorAll("canvas");

      clonedCanvases.forEach((canvas, i) => {
        const originalCanvas = originalCanvases[i];
        if (!originalCanvas) return;

        const img = document.createElement("img");
        img.src = originalCanvas.toDataURL("image/png");
        img.width = originalCanvas.width;
        img.height = originalCanvas.height;
        img.style.display = "block";
        img.style.margin = "0 auto";

        canvas.replaceWith(img);
      });

      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            ${styles}
            <style>
              html, body {
                margin: 0;
                padding: 0;
                background: white;
              }
              @page {
                margin: 0;
              }
            </style>
          </head>
          <body>${clone.outerHTML}</body>
        </html>
      `);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
          resolve();
        }, 250);
      };
    });
  };

  const onFinish = async (patient) => {
    setDisabledButton(true);

    if (!effectiveLocationId || effectiveLocationId === "__ALL__") {
      showAlert(
        "Error",
        t("SELECT_LOCATION_FIRST") || "Please select a clinic first.",
        "error",
      );
      setDisabledButton(false);
      return;
    }

    const nationalId = patient.national_id_number
      ? patient.national_id_number.replace(/\D/g, "")
      : null;

    const normalizedTel = normalizePhone(patient.tel);
    const isNewPatient = kpLookup?.status === "found" ? false : true;

    const selectedOrganization = organizations.find(
      (o) => o.id === patient.organization_id,
    );

    const formattedPatient = buildFormattedPatient({
      patient: {
        ...patient,
        organization_id: selectedOrganization?.id || null,
        organization_name: selectedOrganization?.name || null,
        guardian_name:
          patient.age_group === "child"
            ? (patient.guardian_name || "").trim()
            : null,
      },
      patientPlanOfCare,
      normalizedTel,
      nationalId,
      isNewPatient,
      effectiveLocationId,
      effectiveLocationName,
    });

    const selectedVisitType = recipes.find(
      (recipe) => recipe.value === patient.tipo,
    );

    const visitTypeLabel =
      selectedVisitType?.visit_type ||
      selectedVisitType?.label ||
      formattedPatient.visit_type ||
      formattedPatient.type_of_visit ||
      "";

    try {
      const { ptNo } = await createPatientDoc({ firestore, formattedPatient });

      const createdPatient = {
        pt_no: ptNo,
        patient_name: formattedPatient.patient_name,
        guardian_name: formattedPatient.guardian_name,
        age_group: formattedPatient.age_group,

        organization_id: formattedPatient.organization_id,
        organization_name: formattedPatient.organization_name,
        organization: formattedPatient.organization_name || "",

        type_of_visit: visitTypeLabel,
        visit_type: visitTypeLabel,
        location_name: effectiveLocationName,
        location_message: effectiveLocationMessage,
        created_at: new Date(),
      };

      // stats updates
      const selectedStations = patientPlanOfCare.map((visit) => ({
        station: visit.station,
        status: visit.status,
      }));

      selectedStations.forEach((s) => {
        if (s.status !== "pending") updateStatsCollection(firestore, s.station);
      });

      // known_patients upsert
      if (nationalId) {
        await upsertKnownPatient({
          firestore,
          nationalId,
          patientName: patient.paciente,
          gender: patient.gender,
          ageGroup: patient.age_group,
          organization: selectedOrganization?.name || null,
          tel: normalizedTel ?? null,
          ptNo,
        });
      }

      try {
        const patientPrintFormat =
          effectiveLocation?.printing?.format || "letter";

        if (patientPrintFormat === "none") {
          showAlert("Success", t("patientWasCreated"), "success");
          handleReset();
          return;
        }

        setTicketPatient(createdPatient);

        setTimeout(async () => {
          try {
            await printPatientTicket({
              patient: createdPatient,
              location: effectiveLocation,
              printableNode: ticketPrintRef.current,
              visitTypeLabel:
                createdPatient.visit_type || createdPatient.type_of_visit || "",
            });
          } catch (err) {
            console.error("Ticket print failed:", err);

            showAlert(
              "Warning",
              t("ticketPrintFailed") ||
                "Patient was created, but the ticket did not print.",
              "warning",
            );
          }

          showAlert("Success", t("patientWasCreated"), "success");
          handleReset();
        }, 0);
      } catch (error) {
        console.log("Error creating/updating patient: ", error);

        showAlert("Error", t("somethingWentWrong"), "error");

        setDisabledButton(false);
      }
    } catch (error) {
      console.log("Error creating/updating patient: ", error);

      showAlert("Error", t("somethingWentWrong"), "error");

      setDisabledButton(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Form incomplete:", errorInfo);
  };

  return (
    <>
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
            {/* Clinic picker when location == __ALL__ */}
            <Row>
              <Col xs={24} sm={24}>
                {needsClinicPick && (
                  <Form.Item
                    label={t("SERVICE_LOCATION") || "Service Location"}
                    required
                    help={
                      !registroLocationId
                        ? t("SELECT_LOCATION_FIRST") ||
                          "Select a clinic to register this patient."
                        : null
                    }
                    validateStatus={!registroLocationId ? "error" : ""}
                  >
                    <Select
                      placeholder={t("SELECT_LOCATION") || "Select clinic"}
                      value={registroLocationId}
                      onChange={setRegistroLocationId}
                      options={locations
                        .filter((l) => l.id !== "__ALL__")
                        .map((l) => ({ value: l.id, label: l.name }))}
                    />
                  </Form.Item>
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

            {/* Guardian Name for pediatric visits */}
            {ageGroup === "child" && (
              <Row>
                <Col xs={24} sm={24}>
                  <Form.Item
                    label={t("GUARDIAN_NAME") || "Nombre del responsable"}
                    name="guardian_name"
                    validateFirst
                    rules={[
                      {
                        required: true,
                        message:
                          t("ENTER_GUARDIAN_NAME") ||
                          "Ingrese el nombre del responsable",
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            )}

            {/* National ID Number (DPI) */}
            <Row style={{ display: "contents" }} gutter={24}>
              <Col xs={24} sm={24}>
                <Form.Item
                  label={t("NATIONAL_ID_NUMBER") || "National ID Number"}
                  name="national_id_number"
                  rules={[
                    { required: false },
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
                    maxLength={17}
                    onChange={(e) => {
                      const raw = toRawDpi(e.target.value || "");
                      const formatted = formatDpi(raw);

                      form.setFieldsValue({ national_id_number: formatted });
                      maybeAutofillFromDpi(raw);

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
                      if (!pasted) return;

                      e.preventDefault();
                      const formatted = formatDpi(pasted);
                      form.setFieldsValue({ national_id_number: formatted });
                      maybeAutofillFromDpi(pasted);
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

                {kpLookup.status === "loading" && (
                  <Text type="secondary">
                    {t("searching") || "Searching..."}
                  </Text>
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
                    {t("LOOKUPERROR") ||
                      "There was an error looking up the ID."}
                  </Text>
                )}
              </Col>
            </Row>

            {/* Age Group + Gender */}
            <Row>
              <Col xs={8} sm={8} />
              <Col xs={7} sm={7}>
                <Form.Item
                  label={t("age")}
                  name="age_group"
                  rules={[{ required: true, message: t("selectPatientAge") }]}
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

              <Col xs={8} sm={8}>
                <Form.Item
                  label={t("gender")}
                  name="gender"
                  rules={[
                    { required: true, message: t("selectPatientGender") },
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
                        if (value === undefined || value === "")
                          return Promise.resolve();
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
            <Row>
              <Col xs={24} sm={24}>
                <Form.Item label={t("organization")} name="organization_id">
                  <Select
                    allowClear
                    placeholder={t("selectOrganization")}
                    options={organizations.map((org) => ({
                      value: org.id,
                      label: org.name,
                    }))}
                  />
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
                  rules={[{ required: true, message: t("selectExamType") }]}
                >
                  <Radio.Group
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
                    disabled={disabledButton || !canSubmit}
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

      <div
        style={{
          position: "absolute",
          left: "-10000px",
          top: 0,
          width: "320px",
          pointerEvents: "none",
        }}
      >
        <div ref={ticketPrintRef}>
          {ticketPatient ? (
            <TicketPrint
              patient={ticketPatient}
              printFormat={effectiveLocation?.printing?.format || "letter"}
              thermalDebugStage={1}
            />
          ) : null}
        </div>
      </div>
    </>
  );
};

export default Registro;
