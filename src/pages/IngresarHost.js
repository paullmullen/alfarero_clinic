import React, { useState } from "react";

import { Form, Input, Button, InputNumber, Typography, Divider } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useHistory, Redirect } from "react-router-dom";

import { useHideMenu } from "../hooks/useHideMenu";
import { getUsuarioStorage } from "../helpers/getUsuarioStorage";

const { Title, Text } = Typography;

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 14 },
};

const tailLayout = {
  wrapperCol: { offset: 8, span: 14 },
};

export const IngresarHost = () => {
  const history = useHistory();
  const [usuario] = useState(getUsuarioStorage());

  useHideMenu(false);

  const onFinish = ({ host, servicio }) => {
    localStorage.setItem("host", host);
    localStorage.setItem("servicio", servicio);

    history.push("/escritorio");
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };

  if (usuario.host && usuario.servicio) {
    return <Redirect to="/escritorio" />;
  }

  return (
    <>
      <Title level={1} style={{ color: " rgba(28, 12, 173, 0.89)" }}>
        ¡Bienvenido!
      </Title>
      <Title level={2}>Ingresar</Title>
      <Text>Ingrese su nombre y número de escritorio</Text>
      <Divider />

      <Form
        {...layout}
        name="basic"
        initialValues={{ remember: true }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
      >
        <Form.Item
          label="Nombre del huésped"
          name="host"
          rules={[
            { required: true, message: "Por favor ingrese nombre del huésped" },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Servicio"
          name="servicio"
          rules={[
            {
              required: true,
              message: "Por favor ingrese el número de servicio asignado",
            },
          ]}
        >
          <InputNumber min={1} max={99} />
        </Form.Item>

        <Form.Item {...tailLayout}>
          <Button type="primary" htmlType="submit" shape="round">
            <SaveOutlined />
            Ingresar
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};
