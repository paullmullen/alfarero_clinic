import React, { Suspense } from "react";
import { Row, Col, Typography, Input, Select, Space, Button } from "antd";
import { HexColorPicker } from "react-colorful";
import LocationPicker from "../../../components/LocationPicker";

const { Title, Text, Paragraph } = Typography;

export default function LocationsManager({
  locations,
  onUpdate,
  onAddLocation,
  stations,
  t,
}) {
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
                <div>
                  <Text strong>{t("NAME") || "Name"}</Text>
                  <Input
                    style={{ marginTop: 6 }}
                    value={location.name}
                    onChange={(e) =>
                      onUpdate(location.id, "name", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Text strong>{t("BACKGROUND_COLOR") || "Background Color"}</Text>
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
                          e.target.value
                        )
                      }
                      style={{ width: 140 }}
                    />
                  </div>
                </div>

                <div>
                  <Text strong>{t("COORDINATES") || "Coordinates"}</Text>
                  <div style={{ marginTop: 6 }}>
                    <Suspense fallback={<Text>Loading Location Picker...</Text>}>
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
                  <Text strong>{t("STATIONS") || "Stations"}</Text>
                  <Select
                    mode="multiple"
                    value={location.stations}
                    onChange={(arr) =>
                      onUpdate(location.id, "stations", arr)
                    }
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

      <Button
        type="dashed"
        onClick={onAddLocation}
        style={{ marginTop: 16 }}
      >
        {t("ADD_LOCATION") || "Add Location"}
      </Button>
    </>
  );
}