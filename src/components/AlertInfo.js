import React from "react";
import { Image, Typography, Space, Divider, Card } from "antd";
import { useTranslation } from "react-i18next";
import waiting from "../img/waiting.svg";
import in_process from "../img/in_process.svg";
import complete from "../img/complete.svg";
import eye from "../img/eye.svg";

const { Title } = Typography;

const STATUS_ITEMS = [
  { src: waiting, label: "waitingStatus", width: 20 },
  { src: in_process, label: "attending", width: 20 },
  { src: eye, label: "obser", width: 30 },
  { src: complete, label: "visitCompleted", width: 20 },
];

export const AlertInfo = () => {
  const [t] = useTranslation("global");

  return (
    <Card
      size="small"
      style={{ textAlign: "center", background: "#DDFFF9", padding: "8px" }}
    >
      <Space
        wrap
        split={<Divider type="vertical" />}
        style={{ justifyContent: "center", display: "flex" }}
      >
        {STATUS_ITEMS.map(({ src, label, width }) => (
          <Space key={label} style={{ display: "flex", alignItems: "center" }}>
            <Image
              preview={false}
              src={src}
              width={width}
              style={{ height: "auto", maxHeight: "30px" }}
            />
            <Title level={5} style={{ margin: 0 }}>
              {t(label)}
            </Title>
          </Space>
        ))}
      </Space>
    </Card>
  );
};
