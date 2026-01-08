/* eslint-disable */

import React from "react";
import { Form, Input, Button, Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import { updatePatientData } from "../helpers/updatePatientData";

const EditPatientData = ({ initialValues, onSave }) => {
  const { paciente, tel, motivo, pt_no } = initialValues;
  const [form] = Form.useForm();
  const [t] = useTranslation("global");

  const onFinish = (values) => {
    const { paciente, tel, motivo } = values;
    updatePatientData(paciente, tel, motivo, pt_no);
    onSave(); // Trigger the save callback provided by the parent component
  };

  return (
    <Form form={form} layout="vertical">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Form.Item label={t("DATE_RANGE")} style={{ margin: 0 }}>
          <RangePicker
            format="DD-MMM-YYYY"
            value={pickerRange}
            onChange={(v) => handleDateChange(v, t)}
            locale={i18n.language === "es" ? es_ES : en_US}
            style={{ width: "50%" }}
          />
        </Form.Item>

        <Form.Item label={t("DAYS_WINDOW")} style={{ margin: 0 }}>
          <InputNumber
            min={7}
            max={365}
            step={1}
            value={daysCount}
            onChange={(val) =>
              handleDaysCountChange({ target: { value: val } })
            }
            style={{ width: 120 }}
          />
        </Form.Item>
      </div>

      {/* NEW centered row for the button */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 12,
        }}
      >
        <Button type="primary" onClick={triggerEmail} loading={emailLoading}>
          {t("DAILY_EMAIL")}
        </Button>
      </div>
    </Form>
  );
};

export default EditPatientData;
