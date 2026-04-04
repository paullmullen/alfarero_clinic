import React, { Suspense, useState, useEffect } from "react";
import {
  Row,
  Col,
  Typography,
  Input,
  Select,
  Space,
  Button,
  Switch,
} from "antd";
import { HexColorPicker } from "react-colorful";
import LocationPicker from "../../../components/LocationPicker";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function LocationsManager({
  locations,
  onUpdate,
  onAddLocation,
  stations,
  t,
}) {
  const [draftNames, setDraftNames] = useState({});
  const [draftMessages, setDraftMessages] = useState({});

  useEffect(() => {
    const nextNames = {};
    const nextMessages = {};

    for (const loc of locations) {
      nextNames[loc.id] = loc.name || "";
      nextMessages[loc.id] = loc.message || "";
    }

    setDraftNames(nextNames);
    setDraftMessages(nextMessages);
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

  const isActive = (location) => {
    return location.active !== false;
  };

  return (
    <>
      <Title level={3}>{t("LOCATIONS") || "Locations"}</Title>
      <Paragraph>
        {t("MANAGE_LOCATIONS") ||
          "Manage location names, colors, stations, and GPS coordinates."}
      </Paragraph>

      <Row gutter={[16, 16]}>
        {locations.map((location) => (
          <Col key={location.id} xs={24} md={12} lg={8}>
            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                padding: 16,
                background: "#fff",
              }}
            >
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="middle"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
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

                <div>
                  <Text strong>{t("NAME") || "Name"}</Text>
                  <Input
                    style={{ marginTop: 6 }}
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
                </div>

                <div>
                  <Text strong>
                    {t("PRINT_MESSAGE") || "Printed Ticket Message"}
                  </Text>
                  <Text
                    type="secondary"
                    style={{ display: "block", marginTop: 4, marginBottom: 6 }}
                  >
                    {t("PRINT_MESSAGE_HELP") ||
                      "This message will appear on tickets printed for this location."}
                  </Text>
                  <TextArea
                    rows={4}
                    value={draftMessages[location.id] ?? location.message ?? ""}
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
                </div>

                <div>
                  <Text strong>
                    {t("BACKGROUND_COLOR") || "Background Color"}
                  </Text>
                  <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
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
                      style={{ width: 140 }}
                    />
                  </div>
                </div>

                <div>
                  <Text strong>{t("LOCATION") || "Coordinates"}</Text>
                  <div style={{ marginTop: 6 }}>
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
                  </div>
                </div>

                <div>
                  <Text strong>{t("stations") || "Stations"}</Text>
                  <Select
                    mode="multiple"
                    value={location.stations}
                    onChange={(arr) => onUpdate(location.id, "stations", arr)}
                    style={{ width: "100%", marginTop: 8 }}
                    placeholder={t("ADD_STATIONS") || "Add stations"}
                    options={stations.map((s) => ({
                      label: s.name,
                      value: s.id,
                    }))}
                  />
                </div>
              </Space>
            </div>
          </Col>
        ))}
      </Row>

      <Button type="dashed" onClick={onAddLocation} style={{ marginTop: 16 }}>
        {t("ADD_LOCATION") || "Add Location"}
      </Button>
    </>
  );
}
