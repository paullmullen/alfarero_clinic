import React, { useState } from "react";
import { Alert, Select } from "antd";
import FormField from "../../../components/FormField";

export default function AutoPrintStations({ location, stations, onUpdate, t }) {
  const [saving, setSaving] = useState({});
  const [errors, setErrors] = useState({});

  const saveStations = async (locationId, values) => {
    setSaving((prev) => ({ ...prev, [locationId]: true }));
    setErrors((prev) => ({ ...prev, [locationId]: false }));
    const saved = await onUpdate(locationId, "auto_print_stations", values);
    setErrors((prev) => ({ ...prev, [locationId]: !saved }));
    setSaving((prev) => ({ ...prev, [locationId]: false }));
  };

  return (
    <>
      <FormField label={t("AUTO_PRINT_STATIONS")} help={t("AUTO_PRINT_HELP")}>
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
    </>
  );
}
