import React, { Suspense, useState, useEffect } from "react";
import {
  Row,
  Col,
  Typography,
  Input,
  InputNumber,
  Select,
  Space,
  Button,
  Switch,
} from "antd";
import { HexColorPicker } from "react-colorful";
import LocationPicker from "../../../components/LocationPicker";
import FormField from "../../../components/FormField";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const DEFAULT_PRINTING = {
  format: "letter",
  serverUrl: "",
  ticketPrinterHost: "",
  ticketPrinterPort: 9100,
};

const getPrinting = (location = {}) => ({
  ...DEFAULT_PRINTING,
  ...(location.printing || {}),
});

export default function LocationsManager({
  locations,
  onUpdate,
  onAddLocation,
  stations,
  t,
}) {
  const [draftNames, setDraftNames] = useState({});
  const [draftMessages, setDraftMessages] = useState({});
  const [draftPrintFormats, setDraftPrintFormats] = useState({});
  const [draftPrintServerUrls, setDraftPrintServerUrls] = useState({});
  const [draftPrinterHosts, setDraftPrinterHosts] = useState({});
  const [draftPrinterPorts, setDraftPrinterPorts] = useState({});

  useEffect(() => {
    const nextNames = {};
    const nextMessages = {};
    const nextFormats = {};
    const nextPrintServerUrls = {};
    const nextPrinterHosts = {};
    const nextPrinterPorts = {};

    for (const loc of locations) {
      const printing = getPrinting(loc);

      nextNames[loc.id] = loc.name || "";
      nextMessages[loc.id] = loc.message || "";
      nextFormats[loc.id] = printing.format || "letter";
      nextPrintServerUrls[loc.id] = printing.serverUrl || "";
      nextPrinterHosts[loc.id] = printing.ticketPrinterHost || "";
      nextPrinterPorts[loc.id] = printing.ticketPrinterPort || 9100;
    }

    setDraftNames(nextNames);
    setDraftMessages(nextMessages);
    setDraftPrintFormats(nextFormats);
    setDraftPrintServerUrls(nextPrintServerUrls);
    setDraftPrinterHosts(nextPrinterHosts);
    setDraftPrinterPorts(nextPrinterPorts);
  }, [locations]);

  const commitName = (location) => {
    const draft = (draftNames[location.id] ?? "").trimEnd();
    const current = location.name || "";
    if (draft !== current) {
      onUpdate(location.id, "name", draft);
    }
  };

  const commitMessage = (location) => {
    const draft = (draftMessages[location.id] ?? "").trim();
    const current = (location.message || "").trim();
    if (draft !== current) {
      onUpdate(location.id, "message", draft);
    }
  };

  const commitPrinting = (location, patch) => {
    const nextPrinting = {
      ...getPrinting(location),
      ...patch,
    };

    onUpdate(location.id, "printing", nextPrinting);
  };

  const commitPrintFormat = (location, nextValue = null) => {
    const draft = nextValue || draftPrintFormats[location.id] || "letter";
    const current = getPrinting(location).format || "letter";

    if (draft !== current) {
      commitPrinting(location, { format: draft });
    }
  };

  const commitPrintServerUrl = (location) => {
    const draft = (draftPrintServerUrls[location.id] ?? "").trim();
    const current = getPrinting(location).serverUrl || "";

    if (draft !== current) {
      commitPrinting(location, { serverUrl: draft });
    }
  };

  const commitPrinterHost = (location) => {
    const draft = (draftPrinterHosts[location.id] ?? "").trim();
    const current = getPrinting(location).ticketPrinterHost || "";

    if (draft !== current) {
      commitPrinting(location, { ticketPrinterHost: draft });
    }
  };

  const commitPrinterPort = (location, nextValue = null) => {
    const draft = Number(nextValue || draftPrinterPorts[location.id] || 9100);
    const current = Number(getPrinting(location).ticketPrinterPort || 9100);

    if (draft !== current) {
      commitPrinting(location, { ticketPrinterPort: draft });
    }
  };

  const isActive = (location) => {
    return location.active !== false;
  };

  return (
    <>
      <Title level={3}>{t("LOCATIONS") || "Locations"}</Title>
      <Paragraph>
        {t("MANAGE_LOCATIONS") ||
          "Manage location names, colors, stations, GPS coordinates."}
      </Paragraph>

      <Row gutter={[16, 16]}>
        {locations.map((location) => {
          const printFormat = draftPrintFormats[location.id] || "letter";

          return (
            <Col key={location.id} xs={24} md={12} lg={8}>
              <div style={styles.card}>
                <Space direction="vertical" style={{ width: "100%" }} size={32}>
                  <div style={styles.topRow}>
                    <Space size="small">
                      <Switch
                        checked={isActive(location)}
                        onChange={(checked) =>
                          onUpdate(location.id, "active", checked)
                        }
                      />
                      <Text type={isActive(location) ? "success" : "secondary"}>
                        {isActive(location)
                          ? t("ACTIVE") || "Active"
                          : t("INACTIVE") || "Inactive"}
                      </Text>
                    </Space>
                  </div>

                  <FormField label={t("NAME") || "Name"}>
                    <Input
                      value={draftNames[location.id] ?? location.name ?? ""}
                      onChange={(e) =>
                        setDraftNames((prev) => ({
                          ...prev,
                          [location.id]: e.target.value,
                        }))
                      }
                      onBlur={() => commitName(location)}
                      onPressEnter={() => commitName(location)}
                    />
                  </FormField>

                  <FormField
                    label={t("PRINT_MESSAGE") || "Printed Ticket Message"}
                    help={
                      t("PRINT_MESSAGE_HELP") ||
                      "This message will appear on tickets printed for this location."
                    }
                  >
                    <TextArea
                      rows={4}
                      value={
                        draftMessages[location.id] ?? location.message ?? ""
                      }
                      onChange={(e) =>
                        setDraftMessages((prev) => ({
                          ...prev,
                          [location.id]: e.target.value,
                        }))
                      }
                      onBlur={() => commitMessage(location)}
                      placeholder={
                        t("PRINT_MESSAGE_PLACEHOLDER") ||
                        "Enter the printed ticket message for this location"
                      }
                    />
                  </FormField>

                  <FormField
                    label={t("PRINT_FORMAT") || "Print Format"}
                    help={
                      t("PRINT_FORMAT_HELP") ||
                      "Choose whether this location prints on letter paper or a receipt printer."
                    }
                  >
                    <Select
                      value={printFormat}
                      onChange={(value) => {
                        setDraftPrintFormats((prev) => ({
                          ...prev,
                          [location.id]: value,
                        }));
                        commitPrintFormat(location, value);
                      }}
                      options={[
                        {
                          value: "letter",
                          label: t("PRINT_LETTER") || "Letter (8.5 x 11)",
                        },
                        {
                          value: "ticket",
                          label: t("PRINT_TICKET") || "Receipt / POS Ticket",
                        },
                      ]}
                    />
                  </FormField>

                  {printFormat === "ticket" && (
                    <Space
                      direction="vertical"
                      style={{ width: "100%" }}
                      size={12}
                    >
                      <FormField
                        label={t("PRINT_SERVER_URL") || "Print Server URL"}
                        help={
                          t("PRINT_SERVER_URL_HELP") ||
                          "The base URL of the local print bridge for this location. Example: http://192.168.2.48:3333"
                        }
                      >
                        <Input
                          value={draftPrintServerUrls[location.id] ?? ""}
                          onChange={(e) =>
                            setDraftPrintServerUrls((prev) => ({
                              ...prev,
                              [location.id]: e.target.value,
                            }))
                          }
                          onBlur={() => commitPrintServerUrl(location)}
                          onPressEnter={() => commitPrintServerUrl(location)}
                          placeholder="http://192.168.2.48:3333"
                        />
                      </FormField>

                      <FormField
                        label={
                          t("TICKET_PRINTER_HOST") ||
                          "Ticket Printer IP Address"
                        }
                        help={
                          t("TICKET_PRINTER_HOST_HELP") ||
                          "The IP address or hostname of the ESC/POS ticket printer for this location."
                        }
                      >
                        <Input
                          value={draftPrinterHosts[location.id] ?? ""}
                          onChange={(e) =>
                            setDraftPrinterHosts((prev) => ({
                              ...prev,
                              [location.id]: e.target.value,
                            }))
                          }
                          onBlur={() => commitPrinterHost(location)}
                          onPressEnter={() => commitPrinterHost(location)}
                          placeholder="192.168.1.50"
                        />
                      </FormField>

                      <FormField
                        label={
                          t("TICKET_PRINTER_PORT") || "Ticket Printer Port"
                        }
                        help={
                          t("TICKET_PRINTER_PORT_HELP") ||
                          "Most network ESC/POS printers use port 9100."
                        }
                      >
                        <InputNumber
                          min={1}
                          max={65535}
                          value={draftPrinterPorts[location.id] ?? 9100}
                          onChange={(value) => {
                            const nextValue = value || 9100;
                            setDraftPrinterPorts((prev) => ({
                              ...prev,
                              [location.id]: nextValue,
                            }));
                            commitPrinterPort(location, nextValue);
                          }}
                          style={{ width: "100%" }}
                        />
                      </FormField>
                    </Space>
                  )}

                  <FormField
                    label={t("BACKGROUND_COLOR") || "Background Color"}
                  >
                    <div style={styles.colorRow}>
                      <HexColorPicker
                        color={location.background_color}
                        onChange={(color) =>
                          onUpdate(location.id, "background_color", color)
                        }
                      />
                      <Input
                        value={location.background_color}
                        onChange={(e) =>
                          onUpdate(
                            location.id,
                            "background_color",
                            e.target.value,
                          )
                        }
                        style={styles.colorInput}
                      />
                    </div>
                  </FormField>

                  <FormField label={t("LOCATION") || "Coordinates"}>
                    <Suspense
                      fallback={<Text>Loading Location Picker...</Text>}
                    >
                      <LocationPicker
                        latitude={location.latitude}
                        longitude={location.longitude}
                        onChange={({ lat, lng }) => {
                          onUpdate(location.id, "latitude", lat);
                          onUpdate(location.id, "longitude", lng);
                        }}
                      />
                    </Suspense>
                  </FormField>

                  <FormField label={t("stations") || "Stations"}>
                    <Select
                      mode="multiple"
                      value={location.stations}
                      onChange={(arr) => onUpdate(location.id, "stations", arr)}
                      placeholder={t("ADD_STATIONS") || "Add stations"}
                      options={stations.map((s) => ({
                        label: s.name,
                        value: s.id,
                      }))}
                    />
                  </FormField>
                </Space>
              </div>
            </Col>
          );
        })}
      </Row>

      <Button type="dashed" onClick={onAddLocation} style={{ marginTop: 16 }}>
        {t("ADD_LOCATION") || "Add Location"}
      </Button>
    </>
  );
}

const styles = {
  card: {
    border: "1px solid #f0f0f0",
    borderRadius: 8,
    padding: 16,
    background: "#fff",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  colorRow: {
    marginTop: 2,
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  colorInput: {
    width: 140,
  },
};
