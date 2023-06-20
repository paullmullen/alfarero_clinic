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

  useHideMenu(false);

  const onFinish = async ({ host, servicio }) => {
    if (host.trim() === "" || !servicio) {
      showAlert("Error", "Por favor ingrese todos los campos", "warning");
      return;
    }

    try {
      const isDuplicate = await checkDuplicateRecord("hosts", "host", host);

      if (!isDuplicate) {
        const hostData = { host, servicio };
        await firestore.collection("hosts").add(hostData);
        showAlert("Success", "Datos guardados correctamente", "success");
      } else {
        const hostRef = await getDuplicateRecordRef("hosts", "host", host);

        if (hostRef) {
          await hostRef.update({ servicio });
          showAlert("Success", "Servicio actualizado correctamente", "success");
        }
      }

      localStorage.setItem("host", host);
      localStorage.setItem("servicio", servicio);
      history.push("/escritorio");
      history.push('/anfitrion');
    } catch (error) {
      showAlert("Error", "Error al guardar los datos en Firebase", "error");
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };

  if (usuario.host && usuario.servicio !== 'pfm') {
    return <Redirect to="/escritorio" />;
  } else if (usuario.host && usuario.servicio === "pfm") {
    return <Redirect to="/anfitrion" />;
  }

  return (
    <Row gutter={24} style={{ display: "contents" }}>
      <Col xs={24} sm={24} style={{ overflow: "hidden" }}>
        <Title level={1} style={{ color: "rgba(28, 12, 173, 0.89)" }}>
          ¡Bienvenido!
        </Title>
        <Title level={2}>Ingresar</Title>
        <Text>Ingrese su nombre y el servicio a otorgar</Text>
        <Divider />
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
                label="Nombre del usuario"
                name="host"
                rules={[
                  {
                    required: true,
                    message: "Por favor ingrese nombre del anfitrión",
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
                label="Servicio"
                name="servicio"
                rules={[
                  {
                    required: true,
                    message: "Por favor ingrese el servicio asignado",
                  },
                ]}
                {...halfLayout}
              >
                <Select>
                  {stations.map((station) => (
                    <Option key={station.value} value={station.value}>
                      {station.label}
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
                  Ingresar
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Col>
    </Row>
  );
};
