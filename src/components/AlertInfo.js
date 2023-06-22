import React, { useState } from "react";
import { Image, Alert, Divider, Typography, Space, Row, Col } from "antd";
const { Title } = Typography;

export const AlertInfo = () => {
  const [alignment, setAlignment] = useState("start");
  const [direction, setDirection] = useState("horizontal");
  return (
    <>
      <Alert
        message="Información del Estatus del Paciente "
        description={
          <Row justify="center">
            <Col xs={24} sm={12} md={8} lg={24} style={{ textAlign: "center" }}>
              <Space
                direction={direction}
                align={alignment === "start" ? "start" : "center"}
                wrap
              >
                <Space>
                  <Image
                    preview={false}
                    src={require("../img/waiting.svg")}
                    width={20}
                    height={80}
                  />
                  <Title level={5}>{"En espera para atender"}</Title>
                </Space>
                <Divider />
                <Space>
                  <Image
                    preview={false}
                    src={require("../img/in_process.svg")}
                    width={20}
                    height={80}
                  />
                  <Title level={5}>{"Atendiendo "}</Title>
                </Space>
                <Divider />
                <Space>
                  <Image
                    preview={false}
                    src={require("../img/pay.svg")}
                    width={20}
                    height={80}
                  />
                  <Title level={5}> {"Servicio Pagado "}</Title>
                </Space>
                <Divider />
                <Space>
                  <Image
                    preview={false}
                    src={require("../img/complete.svg")}
                    width={20}
                    height={80}
                  />
                  <Title level={5}> {"Visita completada "}</Title>
                </Space>
              </Space>
            </Col>
          </Row>
        }
        type="info"
        showIcon
      />

      <Divider />
    </>
  );
};
