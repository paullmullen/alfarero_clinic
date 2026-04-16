/* eslint-disable */
import React, { useMemo, useState } from "react";
import { Card, Typography, Form, Select, Input, Space, Button } from "antd";
import { QRCodeSVG } from "qrcode.react";

const { Title, Paragraph, Text } = Typography;

const DEFAULT_DEVICE_ID = "scanner_pi_01";

const ScannerQrGenerator = ({ stations = [], t }) => {
  const [stationId, setStationId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [deviceId, setDeviceId] = useState(DEFAULT_DEVICE_ID);

  const stationOptions = useMemo(() => {
    return (stations || [])
      .filter((s) => s?.station_type || s?.value || s?.id)
      .map((s) => {
        const value = s.station_type || s.value || s.id;
        return {
          value,
          label: t ? t(value) : value,
        };
      });
  }, [stations, t]);

  const handleStationChange = (value) => {
    setStationId(value);

    setRoomId((prev) => {
      if (!prev || /_room_\d+$/.test(prev)) {
        return `${value}_room_1`;
      }
      return prev;
    });

    setDeviceId((prev) => {
      if (
        !prev ||
        prev === DEFAULT_DEVICE_ID ||
        /^scanner_.*_\d+$/.test(prev)
      ) {
        return `scanner_${value}_01`;
      }
      return prev;
    });
  };

  const payloadObject = useMemo(() => {
    if (!stationId || !roomId || !deviceId) return null;

    return {
      kind: "station_config",
      version: 1,
      station_id: stationId,
      room_id: roomId,
      device_id: deviceId,
    };
  }, [stationId, roomId, deviceId]);

  const qrValue = useMemo(() => {
    if (!payloadObject) return "";
    return `MMCFG:${JSON.stringify(payloadObject)}`;
  }, [payloadObject]);

  const handlePrint = () => {
    if (!qrValue) return;

    const qrSvg = document.getElementById("scanner-qr-svg")?.outerHTML || "";
    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Scanner QR</title>
          <style>
            @page {
              size: letter portrait;
              margin: 0.5in;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              margin: 0;
              padding: 0;
            }

            .page {
              width: 100%;
              max-width: 8in;
              margin: 0 auto;
              padding: 0.25in;
              box-sizing: border-box;
            }

            .title {
              text-align: center;
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 8px;
            }

            .subtitle {
              text-align: center;
              font-size: 14px;
              margin-bottom: 24px;
            }

            .qr-wrap {
              display: flex;
              justify-content: center;
              margin-bottom: 24px;
            }

            .qr-box {
              border: 1px solid #ccc;
              border-radius: 12px;
              padding: 20px;
              display: inline-block;
              background: #fff;
            }

            .field {
              margin-bottom: 12px;
              font-size: 16px;
            }

            .label {
              font-weight: 700;
            }

            .payload-label {
              font-weight: 700;
              margin-top: 20px;
              margin-bottom: 8px;
            }

            .payload {
              background: #f7f7f7;
              border: 1px solid #ccc;
              border-radius: 8px;
              padding: 12px;
              word-break: break-all;
              font-family: monospace;
              font-size: 12px;
              line-height: 1.5;
            }

            .note {
              text-align: center;
              color: #666;
              margin-top: 20px;
              font-size: 13px;
            }

            svg {
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="title">
              ${t ? t("SCANNER_QR_PRINT_TITLE") : "Scanner Station Configuration"}
            </div>

            <div class="subtitle">
              ${
                t
                  ? t("SCANNER_QR_PRINT_SUBTITLE")
                  : "Scan this code to configure the scanner station settings."
              }
            </div>

            <div class="qr-wrap">
              <div class="qr-box">
                ${qrSvg}
              </div>
            </div>

            <div class="field">
              <span class="label">${t ? t("SCANNER_QR_STATION_ID") : "Station"}:</span>
              ${stationId}
            </div>

            <div class="field">
              <span class="label">${t ? t("SCANNER_QR_ROOM_ID") : "Room ID"}:</span>
              ${roomId}
            </div>

            <div class="field">
              <span class="label">${t ? t("SCANNER_QR_DEVICE_ID") : "Device ID"}:</span>
              ${deviceId}
            </div>

            <div class="payload-label">
              ${t ? t("SCANNER_QR_RAW_PAYLOAD") : "Raw Payload"}:
            </div>

            <div class="payload">${qrValue}</div>

            <div class="note">
              ${
                t
                  ? t("SCANNER_QR_PRINT_NOTE")
                  : "This QR is intended for station/device assignment only and does not include secrets."
              }
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        {t ? t("SCANNER_QR_GENERATOR_TITLE") : "Scanner QR Generator"}
      </Title>

      <Paragraph type="secondary">
        {t
          ? t("SCANNER_QR_GENERATOR_DESCRIPTION")
          : "Generate a QR code to configure ROOM_ID, STATION_ID, and DEVICE_ID on a scanner."}
      </Paragraph>

      <Form layout="vertical">
        <Form.Item label={t ? t("SCANNER_QR_STATION_ID") : "Station"} required>
          <Select
            placeholder={
              t ? t("SCANNER_QR_STATION_PLACEHOLDER") : "Select a station"
            }
            value={stationId || undefined}
            onChange={handleStationChange}
            options={stationOptions}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item label={t ? t("SCANNER_QR_ROOM_ID") : "Room ID"} required>
          <Input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="reg_room_1"
          />
        </Form.Item>

        <Form.Item label={t ? t("SCANNER_QR_DEVICE_ID") : "Device ID"} required>
          <Input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="scanner_reg_01"
          />
        </Form.Item>
      </Form>

      {qrValue ? (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space>
            <Button type="primary" onClick={handlePrint}>
              {t ? t("SCANNER_QR_PRINT_BUTTON") : "Print QR"}
            </Button>
          </Space>

          <div
            style={{
              background: "#fff",
              border: "1px solid #d9d9d9",
              borderRadius: 8,
              padding: 24,
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              <Title level={2} style={{ marginBottom: 8 }}>
                {t
                  ? t("SCANNER_QR_PRINT_TITLE")
                  : "Scanner Station Configuration"}
              </Title>
              <Paragraph style={{ marginBottom: 0 }}>
                {t
                  ? t("SCANNER_QR_PRINT_SUBTITLE")
                  : "Scan this code to configure the scanner station settings."}
              </Paragraph>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: 20,
                  border: "1px solid #d9d9d9",
                  borderRadius: 12,
                }}
              >
                <QRCodeSVG id="scanner-qr-svg" value={qrValue} size={320} />
              </div>
            </div>

            <div style={{ maxWidth: 700, margin: "0 auto" }}>
              <div style={{ marginBottom: 12 }}>
                <Text strong>
                  {t ? t("SCANNER_QR_STATION_ID") : "Station"}:
                </Text>{" "}
                <Text>{stationId}</Text>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Text strong>{t ? t("SCANNER_QR_ROOM_ID") : "Room ID"}:</Text>{" "}
                <Text>{roomId}</Text>
              </div>

              <div style={{ marginBottom: 20 }}>
                <Text strong>
                  {t ? t("SCANNER_QR_DEVICE_ID") : "Device ID"}:
                </Text>{" "}
                <Text>{deviceId}</Text>
              </div>

              <div style={{ marginBottom: 8 }}>
                <Text strong>
                  {t ? t("SCANNER_QR_RAW_PAYLOAD") : "Raw Payload"}:
                </Text>
              </div>

              <div
                style={{
                  background: "#fafafa",
                  border: "1px solid #d9d9d9",
                  borderRadius: 8,
                  padding: 12,
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {qrValue}
              </div>

              <Paragraph
                type="secondary"
                style={{ marginTop: 20, textAlign: "center" }}
              >
                {t
                  ? t("SCANNER_QR_PRINT_NOTE")
                  : "This QR is intended for station/device assignment only and does not include secrets."}
              </Paragraph>
            </div>
          </div>
        </Space>
      ) : (
        <Paragraph type="secondary">
          {t
            ? t("SCANNER_QR_FILL_FIELDS")
            : "Select a station and complete the fields to generate a QR code."}
        </Paragraph>
      )}
    </Card>
  );
};

export default ScannerQrGenerator;
