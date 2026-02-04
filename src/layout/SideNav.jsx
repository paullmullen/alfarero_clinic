import React from "react";
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
      key: "9",
      icon: <SettingOutlined />,
      label: <Link to="/settings">{t("SETTINGS")}</Link>,
      hidden: !permissions?.settings,
    },
    {
      key: "10",
      icon: <LoginOutlined />,
      label: <Link to="/loginpage">{t("Login")}</Link>,
    },
  ];

  const menuItems = rawMenuItems.filter((item) => !item.hidden);

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
          value={locationId}
          loading={locationsLoading}
          placeholder={t("SELECT_LOCATION") || "Select location"}
          onChange={(val) => setLocationId(val)}
          options={locations.map((loc) => ({
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
