import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Menu, Select, Typography } from "antd";
import {
  UserOutlined,
  ClockCircleOutlined,
  LoginOutlined,
  BarChartOutlined,
  CoffeeOutlined,
  OrderedListOutlined,
  SettingOutlined,
  MedicineBoxOutlined,
  BulbOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useServiceLocation } from "../providers/ServiceLocationProvider";

export default function SideNav({ t, permissions }) {
  const {
    locations,
    locationId,
    setLocationId,
    loading: locationsLoading,
  } = useServiceLocation();

  // Only show active locations (default active if field missing)
  const activeLocations = useMemo(() => {
    return (locations || []).filter((loc) => loc?.active !== false);
  }, [locations]);

  const rawMenuItems = [
    {
      key: "1",
      icon: <LoginOutlined />,
      label: <Link to="/ingresar-host">{t("hostLogin")}</Link>,
      hidden: !permissions?.basic,
    },
    {
      key: "2",
      icon: <CoffeeOutlined />,
      label: <Link to="/anfitrion">{t("pfm")}</Link>,
      hidden: !permissions?.host,
    },
    {
      key: "3",
      icon: <UserOutlined />,
      label: <Link to="/registro">{t("register")}</Link>,
      hidden: !permissions?.host,
    },
    {
      key: "4",
      icon: <ClockCircleOutlined />,
      label: <Link to="/turnos">{t("turnTable")}</Link>,
    },
    {
      key: "5",
      icon: <OrderedListOutlined />,
      label: <Link to="/escritorio">{t("desk")}</Link>,
      hidden: !permissions?.basic,
    },
    {
      key: "7",
      icon: <BarChartOutlined />,
      label: <Link to="/estadisticas">{t("statistics")}</Link>,
      hidden: !permissions?.stats,
    },
    {
      key: "8",
      icon: <BulbOutlined />,
      label: (
        <Link to="/observaciones-operativas">
          {t("ops.title") ||
            t("OPERATIONAL_OBSERVATIONS") ||
            "Operational Observations"}
        </Link>
      ),
      hidden: !permissions?.basic,
    },
    {
      key: "9",
      icon: <SettingOutlined />,
      label: <Link to="/settings">{t("SETTINGS")}</Link>,
      hidden: !permissions?.settings,
    },
    {
      key: "11",
      icon: <MedicineBoxOutlined />,
      label: <Link to="/Inventory">{t("INVENTORY")}</Link>,
    },
    {
      key: "13",
      icon: <CalendarOutlined />,
      label: <Link to="/AppointmentInput">{t("APPOINTMENTS")}</Link>,
    },

    {
      key: "10",
      icon: <LoginOutlined />,
      label: <Link to="/loginpage">{t("login")}</Link>,
    },
  ];

  const menuItems = rawMenuItems.filter((item) => !item.hidden);

  // Optional safety: if current locationId is inactive, Select can look "blank".
  // This keeps the Select from referencing a value not in options.
  const safeLocationId = useMemo(() => {
    if (!locationId) return locationId;
    const isInActiveList = activeLocations.some((l) => l.id === locationId);
    return isInActiveList ? locationId : undefined;
  }, [locationId, activeLocations]);

  return (
    <>
      <Menu
        theme="dark"
        mode="inline"
        defaultSelectedKeys={["1"]}
        items={menuItems}
      />

      <div style={{ padding: 12 }}>
        <br />
        <Typography.Text style={{ color: "rgba(255,255,255,0.75)" }}>
          {t("SERVICE_LOCATION") || "Service Location"}
        </Typography.Text>

        <Select
          style={{ width: "100%", marginTop: 8 }}
          value={safeLocationId}
          loading={locationsLoading}
          placeholder={t("SELECT_LOCATION") || "Select location"}
          onChange={(val) => setLocationId(val)}
          options={activeLocations.map((loc) => ({
            value: loc.id,
            label: loc.name,
          }))}
        />
        <br />
      </div>
    </>
  );
}

SideNav.propTypes = {
  t: PropTypes.func.isRequired,
  permissions: PropTypes.object,
};
