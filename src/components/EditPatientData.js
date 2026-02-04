/* eslint-disable */

import React from "react";
import { Form, Input, Button, Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import { updatePatientData } from "../helpers/updatePatientData";

const EditPatientData = ({ initialValues, onSave }) => {
  const { pt_no } = initialValues;
  const [form] = Form.useForm();
  const [t] = useTranslation("global");

  // ---- National ID helpers ----
  const toRawNationalId = (value) =>
    (value || "").replace(/\D/g, "").slice(0, 13);

  const formatNationalId = (rawDigits) => {
    const v = (rawDigits || "").replace(/\D/g, "").slice(0, 13);
    if (v.length <= 4) return v;
    if (v.length <= 9) return `${v.slice(0, 4)} ${v.slice(4)}`;
    return `${v.slice(0, 4)} ${v.slice(4, 9)} ${v.slice(9, 13)}`;
  };

  // Ensure initial value shows formatted even if Firestore stores it as a number
  const initialValuesFormatted = {
    ...initialValues,
    national_id_number:
      initialValues?.national_id_number !== null &&
      initialValues?.national_id_number !== undefined &&
      String(initialValues.national_id_number).trim() !== ""
        ? formatNationalId(String(initialValues.national_id_number))
        : "",
  };

  const onFinish = (values) => {
    const { paciente, tel, motivo, national_id_number } = values;

    const raw = toRawNationalId(national_id_number);
    const nationalIdInt = raw ? Number(raw) : null;

    updatePatientData(paciente, tel, motivo, pt_no, nationalIdInt);
    onSave();
  };

  return (
    <Form
      form={form}
      name="editPatient"
      initialValues={initialValuesFormatted}
      onFinish={onFinish}
    >
      <Row gutter={[16, 16]}>
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

      {/* National ID Number (enforced format #### ##### ####) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24}>
          <Form.Item
            label={t("NATIONAL_ID_NUMBER") || "National ID Number"}
            name="national_id_number"
            rules={[
              { required: false },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const raw = toRawNationalId(value);
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
                const raw = toRawNationalId(e.target.value || "");
                const formatted = formatNationalId(raw);
                form.setFieldsValue({ national_id_number: formatted });

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
                  const formatted = formatNationalId(pasted);
                  form.setFieldsValue({ national_id_number: formatted });
                }
              }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
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
                      value,
                    )
                  ) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t("enterValidPhoneNumber")));
                },
              },
            ]}
          >
            <Input type="tel" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
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

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24}>
          <Form.Item>
            <Button type="primary" htmlType="submit" shape="round" name="save">
              {t("SAVE")}
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default EditPatientData;
