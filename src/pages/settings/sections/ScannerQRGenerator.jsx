/* eslint-disable */
import React, { useMemo, useState } from "react";
import {
  Card,
  Typography,
  Form,
  Select,
  Input,
  Space,
  Button,
  message,
} from "antd";
import { QRCodeSVG } from "qrcode.react";

const { Title, Paragraph, Text } = Typography;

const DEFAULT_DEVICE_ID = "scanner_pi_01";

const CLOUD_QR_ADMIN_TOKEN = process.env.REACT_APP_SCANNER_QR_ADMIN_TOKEN || "";

const CLOUD_QR_ENDPOINT =
  "https://us-central1-alfarero-478ad.cloudfunctions.net/generateScannerCloudQr";

const STATION_QR_ENDPOINT =
  "https://us-central1-alfarero-478ad.cloudfunctions.net/generateScannerStationQr";

const ScannerQrGenerator = ({ stations = [], t }) => {
  const [qrType, setQrType] = useState("station_config");

  const [stationId, setStationId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [deviceId, setDeviceId] = useState(DEFAULT_DEVICE_ID);

  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [security, setSecurity] = useState("wpa-psk");

  const [generatedQrValue, setGeneratedQrValue] = useState("");
  const [loadingGeneratedQr, setLoadingGeneratedQr] = useState(false);

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

  const qrTypeOptions = [
    {
      value: "station_config",
      label: t ? t("SCANNER_QR_TYPE_STATION") : "Station Configuration",
    },
    {
      value: "wifi_config",
      label: t ? t("SCANNER_QR_TYPE_WIFI") : "WiFi Configuration",
    },
    {
      value: "cloud_config",
      label: t ? t("SCANNER_QR_TYPE_CLOUD") : "Cloud Configuration",
    },
  ];

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

  const localPayloadObject = useMemo(() => {
    if (qrType === "wifi_config") {
      if (!ssid || password === "") return null;

      return {
        kind: "wifi_config",
        version: 1,
        payload: {
          ssid,
          password,
          security,
        },
        auth: {
          admin_token: CLOUD_QR_ADMIN_TOKEN,
        },
      };
    }

    return null;
  }, [qrType, ssid, password, security]);

  const qrValue = useMemo(() => {
    if (qrType === "cloud_config" || qrType === "station_config") {
      return generatedQrValue;
    }

    if (!localPayloadObject) return "";
    return `MMCFG:${JSON.stringify(localPayloadObject)}`;
  }, [qrType, generatedQrValue, localPayloadObject]);

  const printTitle =
    qrType === "cloud_config"
      ? t
        ? t("SCANNER_QR_PRINT_TITLE_CLOUD")
        : "Scanner Cloud Configuration"
      : qrType === "wifi_config"
        ? t
          ? t("SCANNER_QR_PRINT_TITLE_WIFI")
          : "Scanner WiFi Configuration"
        : t
          ? t("SCANNER_QR_PRINT_TITLE")
          : "Scanner Station Configuration";

  const printSubtitle =
    qrType === "cloud_config"
      ? t
        ? t("SCANNER_QR_PRINT_SUBTITLE_CLOUD")
        : "Scan this code to configure the scanner cloud connection."
      : qrType === "wifi_config"
        ? t
          ? t("SCANNER_QR_PRINT_SUBTITLE_WIFI")
          : "Scan this code to configure the scanner WiFi settings."
        : t
          ? t("SCANNER_QR_PRINT_SUBTITLE")
          : "Scan this code to configure the scanner station settings.";

  const canGenerateStationQr = !!stationId && !!roomId && !!deviceId;
  const canGenerateWifiQr = !!ssid && password !== "";
  const canPrint = !!qrValue;

  const fetchCloudQr = async () => {
    try {
      setLoadingGeneratedQr(true);
      setGeneratedQrValue("");

      const response = await fetch(CLOUD_QR_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CLOUD_QR_ADMIN_TOKEN}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data?.ok || !data?.qrValue) {
        throw new Error(data?.error || "Failed to generate cloud QR");
      }

      setGeneratedQrValue(data.qrValue);
      message.success(
        t ? t("SCANNER_QR_CLOUD_GENERATED") : "Cloud QR generated.",
      );
    } catch (err) {
      console.error(err);
      message.error(
        t
          ? t("SCANNER_QR_CLOUD_GENERATE_ERROR")
          : "Failed to generate cloud QR.",
      );
    } finally {
      setLoadingGeneratedQr(false);
    }
  };

  const fetchStationQr = async () => {
    if (!canGenerateStationQr) {
      message.warning(
        t
          ? t("SCANNER_QR_FILL_FIELDS")
          : "Complete the fields to generate a QR code.",
      );
      return;
    }

    try {
      setLoadingGeneratedQr(true);
      setGeneratedQrValue("");

      const response = await fetch(STATION_QR_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CLOUD_QR_ADMIN_TOKEN}`,
        },
        body: JSON.stringify({
          room_id: roomId,
          station_id: stationId,
          device_id: deviceId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok || !data?.qrValue) {
        throw new Error(data?.error || "Failed to generate station QR");
      }

      setGeneratedQrValue(data.qrValue);
      message.success(
        t ? t("SCANNER_QR_STATION_GENERATED") : "Station QR generated.",
      );
    } catch (err) {
      console.error(err);
      message.error(
        t
          ? t("SCANNER_QR_STATION_GENERATE_ERROR")
          : "Failed to generate station QR.",
      );
    } finally {
      setLoadingGeneratedQr(false);
    }
  };

  const handlePrint = () => {
    if (!qrValue) {
      message.warning(
        t
          ? t("SCANNER_QR_NOT_READY")
          : "Generate or complete the QR configuration first.",
      );
      return;
    }

    const qrSvg = document.getElementById("scanner-qr-svg")?.outerHTML || "";
    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) return;

    const detailHtml =
      qrType === "cloud_config"
        ? `
          <div class="note">
            ${
              t
                ? t("SCANNER_QR_PRINT_NOTE_CLOUD")
                : "Sensitive QR. Do not leave printed copies unattended."
            }
          </div>
        `
        : qrType === "wifi_config"
          ? `
          <div class="field">
            <span class="label">${t ? t("SCANNER_QR_WIFI_SSID") : "SSID"}:</span>
            ${ssid}
          </div>
          <div class="field">
            <span class="label">${t ? t("SCANNER_QR_WIFI_SECURITY") : "Security"}:</span>
            ${security}
          </div>
        `
          : `
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
        `;

    const showRawPayload = false;

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
            <div class="title">${printTitle}</div>
            <div class="subtitle">${printSubtitle}</div>

            <div class="qr-wrap">
              <div class="qr-box">${qrSvg}</div>
            </div>

            ${detailHtml}

            ${
              showRawPayload
                ? `
              <div class="payload-label">
                ${t ? t("SCANNER_QR_RAW_PAYLOAD") : "Raw Payload"}:
              </div>

              <div class="payload">${qrValue}</div>
            `
                : ""
            }
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
          : "Generate QR codes for scanner configuration."}
      </Paragraph>

      <Form layout="vertical">
        <Form.Item label={t ? t("SCANNER_QR_TYPE") : "QR Type"} required>
          <Select
            value={qrType}
            onChange={(value) => {
              setQrType(value);
              setGeneratedQrValue("");
            }}
            options={qrTypeOptions}
          />
        </Form.Item>

        {qrType === "station_config" && (
          <>
            <Form.Item
              label={t ? t("SCANNER_QR_STATION_ID") : "Station"}
              required
            >
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

            <Form.Item
              label={t ? t("SCANNER_QR_DEVICE_ID") : "Device ID"}
              required
            >
              <Input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="scanner_reg_01"
              />
            </Form.Item>

            <Space direction="vertical" size="middle">
              <Button
                onClick={fetchStationQr}
                loading={loadingGeneratedQr}
                disabled={!canGenerateStationQr}
              >
                {t ? t("SCANNER_QR_GENERATE_STATION") : "Generate Station QR"}
              </Button>
              {generatedQrValue && (
                <Text type="success">
                  {t ? t("SCANNER_QR_STATION_READY") : "QR ready to print."}
                </Text>
              )}
            </Space>
          </>
        )}

        {qrType === "wifi_config" && (
          <>
            <Form.Item label={t ? t("SCANNER_QR_WIFI_SSID") : "SSID"} required>
              <Input
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                placeholder="ClinicWiFi"
              />
            </Form.Item>

            <Form.Item
              label={t ? t("SCANNER_QR_WIFI_PASSWORD") : "Password"}
              required
            >
              <Input.Password
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="WiFi password"
              />
            </Form.Item>

            <Form.Item
              label={t ? t("SCANNER_QR_WIFI_SECURITY") : "Security"}
              required
            >
              <Select
                value={security}
                onChange={setSecurity}
                options={[{ value: "wpa-psk", label: "WPA-PSK" }]}
              />
            </Form.Item>
          </>
        )}

        {qrType === "cloud_config" && (
          <Space direction="vertical" size="middle">
            <Button onClick={fetchCloudQr} loading={loadingGeneratedQr}>
              {t ? t("SCANNER_QR_GENERATE_CLOUD") : "Generate Cloud QR"}
            </Button>
            {generatedQrValue && (
              <Text type="success">
                {t ? t("SCANNER_QR_CLOUD_READY") : "QR ready to print."}
              </Text>
            )}
          </Space>
        )}
      </Form>

      {canPrint ? (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space>
            <Button type="primary" onClick={handlePrint}>
              {t ? t("SCANNER_QR_PRINT") : "Print QR"}
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
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <Title level={2} style={{ marginBottom: 8 }}>
                {printTitle}
              </Title>
              <Paragraph style={{ marginBottom: 0 }}>{printSubtitle}</Paragraph>
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
              {qrType === "cloud_config" ? (
                <Paragraph type="secondary" style={{ textAlign: "center" }}>
                  {t
                    ? t("SCANNER_QR_PRINT_NOTE_CLOUD")
                    : "Sensitive QR. Do not leave printed copies unattended."}
                </Paragraph>
              ) : qrType === "wifi_config" ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>
                      {t ? t("SCANNER_QR_WIFI_SSID") : "SSID"}:
                    </Text>{" "}
                    <Text>{ssid}</Text>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <Text strong>
                      {t ? t("SCANNER_QR_WIFI_SECURITY") : "Security"}:
                    </Text>{" "}
                    <Text>{security}</Text>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>
                      {t ? t("SCANNER_QR_STATION_ID") : "Station"}:
                    </Text>{" "}
                    <Text>{stationId}</Text>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <Text strong>
                      {t ? t("SCANNER_QR_ROOM_ID") : "Room ID"}:
                    </Text>{" "}
                    <Text>{roomId}</Text>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <Text strong>
                      {t ? t("SCANNER_QR_DEVICE_ID") : "Device ID"}:
                    </Text>{" "}
                    <Text>{deviceId}</Text>
                  </div>
                </>
              )}

              {qrType !== "cloud_config" && (
                <Paragraph
                  type="secondary"
                  style={{ marginTop: 20, textAlign: "center" }}
                >
                  {qrType === "wifi_config"
                    ? t
                      ? t("SCANNER_QR_PRINT_NOTE_WIFI")
                      : "This QR contains WiFi credentials. Handle it carefully."
                    : t
                      ? t("SCANNER_QR_PRINT_NOTE")
                      : "This QR is intended for station/device assignment only and does not include secrets."}
                </Paragraph>
              )}
            </div>
          </div>
        </Space>
      ) : (
        <Paragraph type="secondary">
          {qrType === "cloud_config"
            ? generatedQrValue
              ? t
                ? t("SCANNER_QR_CLOUD_READY")
                : "QR ready to print."
              : t
                ? t("SCANNER_QR_CLOUD_NOT_READY")
                : "Generate the cloud QR before printing."
            : qrType === "station_config"
              ? generatedQrValue
                ? t
                  ? t("SCANNER_QR_STATION_READY")
                  : "QR ready to print."
                : t
                  ? t("SCANNER_QR_FILL_FIELDS")
                  : "Select a station and complete the fields to generate a QR code."
              : t
                ? t("SCANNER_QR_FILL_FIELDS")
                : "Complete the fields to generate a QR code."}
        </Paragraph>
      )}
    </Card>
  );
};

export default ScannerQrGenerator;
