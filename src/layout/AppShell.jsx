import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Layout } from "antd";
import styled from "styled-components";
import { AlertProvider } from "../hooks/alert";
import SideNav from "./SideNav";
import TopBar from "./TopBar";
import { useAggregationHeartbeat } from "../hooks/useAggregationHeartbeat";
import { usePatientCount } from "../hooks/usePatientCount";
import { useServiceLocation } from "../providers/ServiceLocationProvider";

const { Sider, Content } = Layout;

const isAlfareroDev = process.env.REACT_APP_FIREBASE_DB !== "";

// Sidebar customization with dynamic styles
const CustomSider = styled(Sider).withConfig({
  shouldForwardProp: (prop) => prop !== "selectedColor" && prop !== "isDev",
})`
  display: flex;
  flex-direction: column;

  .ant-menu {
    flex: 1;
  }

  .ant-menu-dark .ant-menu-item-selected {
    background-color: ${(props) => props.selectedColor} !important;
  }

  .ant-menu-dark .ant-menu-item:hover {
    background-color: ${(props) => props.selectedColor} !important;
  }

  .ant-menu-dark .ant-menu-item-selected a {
    color: #ffffff !important;
  }
`;

export default function AppShell({ ocultarMenu, t, permissions, children }) {
  // heartbeat (same behavior as before)
  useAggregationHeartbeat({ enabled: true, intervalMs: 60000 });

  const [currentTime, setCurrentTime] = useState(new Date());

  const { locations, locationId, loading } = useServiceLocation();

  // patient count polling (filtered by sider location)
  const { count } = usePatientCount({
    enabled: !loading && !!locationId, // optional but recommended
    intervalMs: 60000,
    locationId, // ✅ pass current selection
  });

  const selectedColor = React.useMemo(() => {
    const loc = locations.find((l) => l.id === locationId);
    return loc?.background_color || null; // e.g. "#d4d8f9"
  }, [locations, locationId]);

  const fallbackSelectedColor = isAlfareroDev ? "#52c41a" : "#1890ff";
  const menuSelectedColor = selectedColor || fallbackSelectedColor;

  // purely for the displayed clock
  React.useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [currentTime]);

  return (
    <Layout style={{ minHeight: "100vh", minWidth: "100%" }}>
      <CustomSider
        collapsedWidth="0"
        breakpoint="lg"
        hidden={ocultarMenu}
        isDev={isAlfareroDev}
        selectedColor={menuSelectedColor}
      >
        <SideNav t={t} permissions={permissions} />
        <div
          style={{
            marginTop: "auto",
            padding: "12px",
            color: "rgba(255,255,255,0.45)",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          <hr />
          <br />V{t("version")}
        </div>
      </CustomSider>

      <Layout className="site-layout">
        <TopBar
          t={t}
          isDev={isAlfareroDev}
          formattedTime={formattedTime}
          count={count}
        />

        <Content style={{ margin: "24px 16px", padding: 24, minHeight: 280 }}>
          <AlertProvider>{children}</AlertProvider>
        </Content>
      </Layout>
    </Layout>
  );
}

AppShell.propTypes = {
  ocultarMenu: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
  permissions: PropTypes.object,
  children: PropTypes.node.isRequired,
};
