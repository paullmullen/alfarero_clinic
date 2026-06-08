/* eslint-disable */

import React from "react";
import { Form, Input, Button, Row, Col, Select } from "antd";
import { useTranslation } from "react-i18next";
import { updatePatientData } from "../helpers/updatePatientData";
import { firestore } from "../helpers/firebaseConfig";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";

const EditPatientData = ({ initialValues, onSave }) => {
  const { pt_no } = initialValues;
  const [form] = Form.useForm();
  const [t] = useTranslation("global");
  const [organizations, setOrganizations] = useState([]);

  const ageGroup = Form.useWatch("age_group", form);
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

  // ---- National ID helpers ----
  const toRawNationalId = (value) =>
    (value || "").replace(/\D/g, "").slice(0, 13);

  const formatNationalId = (rawDigits) => {
    const v = (rawDigits || "").replace(/\D/g, "").slice(0, 13);
    if (v.length <= 4) return v;
    if (v.length <= 9) return `${v.slice(0, 4)} ${v.slice(4)}`;
    return `${v.slice(0, 4)} ${v.slice(4, 9)} ${v.slice(9, 13)}`;
  };

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
    const {
      paciente,
      tel,
      motivo,
      national_id_number,
      guardian_name,
      organization_id,
    } = values;
    const raw = toRawNationalId(national_id_number);
    const nationalIdInt = raw ? Number(raw) : null;

    const selectedOrganization = organizations.find(
      (o) => o.id === organization_id,
    );

    updatePatientData(paciente, tel, motivo, pt_no, nationalIdInt, {
      guardian_name:
        values.age_group === "child" ? guardian_name?.trim() || null : null,

      organization_id: selectedOrganization?.id || null,
      organization_name: selectedOrganization?.name || null,
    });

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
        <Col xs={24}>
          <Form.Item
            label={t("name")}
            name="paciente"
            rules={[{ required: true, message: t("name") }]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      {/* Age Group (needed for guardian logic) */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Form.Item name="age_group" hidden>
            <Input />
          </Form.Item>
        </Col>
      </Row>

      {/* Guardian Name (only for children) */}
      {ageGroup === "child" && (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Form.Item
              label={t("GUARDIAN_NAME") || "Nombre del responsable"}
              name="guardian_name"
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

      {/* National ID */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
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
              maxLength={17}
              onChange={(e) => {
                const raw = toRawNationalId(e.target.value || "");
                const formatted = formatNationalId(raw);
                form.setFieldsValue({ national_id_number: formatted });

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

      {/* Phone */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Form.Item
            label={t("tel")}
            name="tel"
            rules={[
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
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

      {/* Organization */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
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
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Form.Item
            label={t("reasonForVisit")}
            name="motivo"
            rules={[{ required: true, message: t("reasonForVisit") }]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      {/* Submit */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Form.Item>
            <Button type="primary" htmlType="submit" shape="round">
              {t("SAVE")}
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default EditPatientData;
