import React from "react";
import { Image, Alert, Divider, Typography, Space, Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import waiting from "../img/waiting.svg";
import in_process from "../img/in_process.svg";
import complete from "../img/complete.svg";
import eye from "../img/eye.png";
const { Title } = Typography;

export const AlertInfo = () => {
  const [t] = useTranslation("global")
  return (
    <>
      <Alert
        description={
          <Row justify="center">
            <Col xs={24} sm={12} md={8} lg={24} style={{ textAlign: "center" }}>
              <Space
                wrap
              >
                <Space>
                  <Image
                    preview={false}
                    src={waiting}
                    width={20}
                    height={80}
                  />
                  <Title level={5}>{t('waitingStatus')}</Title>
                </Space>
                <Divider />
                <Space>
                  <Image
                    preview={false}
                    src={in_process}
                    width={20}
                    height={80}
                  />
                  <Title level={5}>{t('attending')}</Title>
                </Space>
                <Divider />
                <Space>
                  <Image
                    preview={false}
                    src={eye}
                    // width={40}
                    height={40}
                  />
                  <Title level={5}>{t('obser')}</Title>
                </Space>
                <Divider />
                <Space>
                  <Image
                    preview={false}
                    src={complete}
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
        // showIcon
      />

      <Divider />
    </>
  );
};
