import React from "react";
import { Row, Col, InputNumber, Typography, Space } from "antd";
import { useTranslation } from "react-i18next";


const { Title, Text, Paragraph } = Typography;

export default function StationsMaxWait({ stations, onUpdate }) {
    const [t] = useTranslation("global");
  
  return (
    <>
      <Title level={3}>{t("MAX_WAIT_TIMES")}</Title>
      <Paragraph>
        {t("ENTER_WAITING_TIMES")}
      </Paragraph>

      <Row gutter={[16, 16]}>
        {stations.map((station) => (
          <Col key={station.id} xs={24} md={12} lg={8}>
            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                padding: 16,
                background: "#fff",
              }}
            >
              <Title level={4} style={{ marginBottom: 12 }}>
                {station.name}
              </Title>

              <Space align="baseline">
                <InputNumber
                  min={0}
                  step={30}
                  value={station.max_waiting_time}
                  onChange={(value) => onUpdate(station.id, value)}
                  style={{ width: 140 }}
                />
                <Text>
                  {(Number(station.max_waiting_time || 0) / 60).toFixed(1)} min
                </Text>
              </Space>
            </div>
          </Col>
        ))}
      </Row>
    </>
  );
}