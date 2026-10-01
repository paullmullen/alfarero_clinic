import React, { useState } from "react";
import { Alert, Button, Card, Col, Row, Select, Typography } from "antd";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FormField from "../../components/FormField";
import { useHideMenu } from "../../hooks/useHideMenu";
import { useLocations } from "./hooks/useLocations";
import { useStations } from "./hooks/useStations";

export default function TicketPrintingSettings() {
  const [t] = useTranslation("global");
  const { locations, updateLocation } = useLocations();
  const { stations } = useStations({ includeInactive: true });
  const [saving, setSaving] = useState({});
  const [errors, setErrors] = useState({});
  useHideMenu(false);

  const saveStations = async (locationId, values) => {
    setSaving((prev) => ({ ...prev, [locationId]: true }));
    setErrors((prev) => ({ ...prev, [locationId]: false }));
    const saved = await updateLocation(locationId, "auto_print_stations", values);
    setErrors((prev) => ({ ...prev, [locationId]: !saved }));
    setSaving((prev) => ({ ...prev, [locationId]: false }));
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Button style={{ marginBottom: 16 }}>
        <Link to="/settings">{t("BACK_TO_SETTINGS")}</Link>
      </Button>
      <Typography.Title level={1}>{t("TICKET_PRINTING_SETTINGS")}</Typography.Title>
      <Typography.Paragraph>{t("AUTO_PRINT_HELP")}</Typography.Paragraph>
      <Row gutter={[16, 16]}>
        {locations.map((location) => (
          <Col key={location.id} xs={24} md={12} lg={8}>
            <Card title={location.name}>
              <FormField label={t("AUTO_PRINT_STATIONS")}>
                <Select
                  aria-label={`${location.name}: ${t("AUTO_PRINT_STATIONS")}`}
                  style={{ width: "100%" }}
                  mode="multiple"
                  allowClear
                  optionFilterProp="label"
                  value={location.auto_print_stations}
                  disabled={saving[location.id]}
                  loading={saving[location.id]}
                  placeholder={t("AUTO_PRINT_PLACEHOLDER")}
                  options={stations.map((station) => ({
                    value: station.id,
                    label: station.name,
                  }))}
                  onChange={(values) => saveStations(location.id, values)}
                />
              </FormField>
              {errors[location.id] && (
                <Alert style={{ marginTop: 12 }} type="error" showIcon
                  message={t("AUTO_PRINT_SAVE_FAILED")} />
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
