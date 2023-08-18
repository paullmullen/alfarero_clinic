import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Divider,
  Select,
  Row,
  Col,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useHistory, Redirect } from "react-router-dom";
import { useHideMenu } from "../hooks/useHideMenu";
import { getUsuarioStorage } from "../helpers/getUsuarioStorage";
import { useAlert } from "../hooks/alert";
import { firestore } from "./../helpers/firebaseConfig";
import {
  checkDuplicateRecord,
  getDuplicateRecordRef,
} from "../helpers/checkDuplicateRecord";
import { stations } from "../helpers/stations";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;
const { Option } = Select;

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 14 },
};

const halfLayout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 12 },
};

const tailLayout = {
  wrapperCol: { offset: 8, span: 14 },
};

export const IngresarHost = () => {
  const history = useHistory();
  const { showAlert } = useAlert();
  const [form] = Form.useForm();
  const [usuario] = useState(getUsuarioStorage());
  const [t,i18n] = useTranslation("global");

  useHideMenu(false);

  const stationOptions = stations.map((station) => ({
    label: t(station.value),
    value: station.value,
  }));

  // Validation functionality on the screen's form

  const onFinish = async ({ host, servicio }) => {
    if (host.trim() === "" || !servicio) {
      showAlert("Error", t("allFieldsAlert"), "warning");
      return;
    }

    try {
      const isDuplicate = await checkDuplicateRecord("hosts", "host", host);

      if (!isDuplicate) {
        const hostData = { host, servicio };
        await firestore.collection("hosts").add(hostData);
        showAlert("Success", t("infoSavedSuccessfully"), "success");
      } else {
        const hostRef = await getDuplicateRecordRef("hosts", "host", host);

        if (hostRef) {
          await hostRef.update({ servicio });
          showAlert("Success", t("dataUpdatedAlert"), "success");
        }
      }

      localStorage.setItem("host", host);
      localStorage.setItem("servicio", servicio);
      if (servicio !== "pfm") {
        history.push("/escritorio");
      } else if (servicio === "pfm") {
        // history.push("/escritorio");
        history.push("/anfitrion");
      }
    } catch (error) {
      showAlert("Error", t("errorWhileSaving"), "error");
    }
  };

  // Checks if the person is a patient flow manager and redirect them depending on the response

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };

  if (usuario.host && usuario.servicio !== "pfm") {
    return <Redirect to="/escritorio" />;
  } else if (usuario.host && usuario.servicio === "pfm") {
    return <Redirect to="/anfitrion" />;
  }

  // Renders the visible screen

  return (
    <Row gutter={24} style={{ display: "contents" }}>
      <Col xs={24} sm={24} style={{ overflow: "hidden" }}>
        <Title level={1} style={{ color: "rgba(28, 12, 173, 0.89)" }}>
          {t("greeting")}
        </Title>
        <br />
        <br />
        <Title level={2}>{t("login")}</Title>
        <Text>{t("enterNameAndService")}</Text>
        <Divider />
        <button onClick={() => i18n.changeLanguage("es")}>ES</button>
        <button onClick={() => i18n.changeLanguage("en")}>EN</button>
        <Form
          {...layout}
          name="basic"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          form={form}
        >
          <Row gutter={24}>
            <Col xs={24} sm={24}>
              <Form.Item
                label={t("name")}
                name="host"
                rules={[
                  {
                    required: true,
                    message: t("enterName"),
                  },
                ]}
                {...halfLayout}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={24}>
              <Form.Item
                label={t("service")}
                name="servicio"
                rules={[
                  {
                    required: true,
                    message: t("enterService"),
                  },
                ]}
                {...halfLayout}
              >
                <Select showArrow>
                  {stationOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={24}>
              <Form.Item {...tailLayout}>
                <Button type="primary" htmlType="submit" shape="round">
                  <SaveOutlined />
                  {t("login")}
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Col>
    </Row>
  );
};

