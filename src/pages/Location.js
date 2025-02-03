/* eslint-disable no-unused-vars */

import React, { useEffect } from "react";
import { Row, Col, Divider, Typography, Button, Select, Form } from "antd";
import { useHideMenu } from "../hooks/useHideMenu";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom"; // Use useHistory for React Router v5

const { Title, Text } = Typography;

export const Location = () => {
  const history = useHistory(); // Corrected hook for React Router v5
  const [t] = useTranslation("global");

  useHideMenu(false);

  useEffect(() => {
    console.log("page loaded");
  }, []);

  // Form submission handler
  const onFinish = (values) => {
    alert(`Selected Option: ${values.location}`);
    // Example of navigation after form submission
    history.push("/next-page"); // Change "/next-page" to your actual route
  };

  return (
    <Row gutter={24} style={{ display: "contents" }}>
      <Col xs={24} sm={24} style={{ overflow: "hidden" }}>
        <Title level={1} style={{ color: "rgba(28,12,173,0.89)" }}>
          {t("LOCATION")}
        </Title>
        <br />
        <Text>{t("SAMPLE_TEXT")}</Text>
        <Divider />

        {/* Ant Design Form */}
        <Form
          name="locationForm"
          layout="vertical"
          onFinish={onFinish}
          style={{ maxWidth: "300px", margin: "auto" }}
        >
          <Form.Item
            label={t("SELECT_LOC")}
            name="location"
            rules={[{ required: true, message: t("PLEASE_SELECT_OPTION") }]}
          >
            <Select placeholder="--Select--">
              <Select.Option value="1">1</Select.Option>
              <Select.Option value="2">2</Select.Option>
              <Select.Option value="3">3</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {t("SUBMIT")}
            </Button>
          </Form.Item>
        </Form>
        <Divider />
      </Col>
    </Row>
  );
};

export default Location;
