import React, { useState } from "react";
import { Image, Alert, Divider, Typography, Space, Row, Col } from "antd";
import { useTranslation } from "react-i18next";
const { Title } = Typography;

export const AlertInfo = () => {
  const [alignment, setAlignment] = useState("start");
  const [direction, setDirection] = useState("horizontal");
  const [t] = useTranslation("global")
  return (
    <>
      <Alert
        message= {t('infoPatient')}
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
                  <Title level={5}>{t('waitingStatus')}</Title>
                </Space>
                <Divider />
                <Space>
                  <Image
                    preview={false}
                    src={require("../img/in_process.svg")}
                    width={20}
                    height={80}
                  />
                  <Title level={5}>{t('attending')}</Title>
                </Space>
                <Divider />
                <Space>
                  <Image
                    preview={false}
                    src={require("../img/eye.svg")}
                    width={20}
                    height={80}
                  />
                  <Title level={5}>{t('obser')}</Title>
                </Space>
                <Divider />
                <Space>
                  <Image
                    preview={false}
                    src={require("../img/complete.svg")}
                    width={20}
                    height={80}
                  />
                  <Title level={5}> {t('visitCompleted')}</Title>
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
