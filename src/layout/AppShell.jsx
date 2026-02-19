import React, { useMemo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Layout, Typography, Divider } from "antd";
import styled from "styled-components";
import { AlertProvider } from "../hooks/alert";
import SideNav from "./SideNav";
import TopBar from "./TopBar";
import { useAggregationHeartbeat } from "../hooks/useAggregationHeartbeat";
import { usePatientCount } from "../hooks/usePatientCount";
import { useServiceLocation } from "../providers/ServiceLocationProvider";
import ReleaseNotesModal from "../components/ReleaseNotesModal";
import { useLocation } from "react-router-dom";

const { Sider, Content } = Layout;

const isAlfareroDev = process.env.REACT_APP_FIREBASE_DB !== "";

// Sidebar customization with dynamic styles
const CustomSider = styled(Sider).withConfig({
  shouldForwardProp: (prop) => prop !== "selectedColor" && prop !== "isDev",
})`
  .ant-layout-sider-children {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
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

const SiderFooter = styled.div`
  padding: 12px;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;

  line-height: 1.4;
  overflow: visible;
  min-height: 44px;

  .ant-typography {
    color: rgba(255, 255, 255, 0.65);
  }
`;

// NEW: right-side column wrapper to make TopBar non-scrolling and Content the scroll container
const RightColumn = styled(Layout)`
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

// NEW: sticky wrapper for TopBar
const StickyTopBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
`;

export default function AppShell({ ocultarMenu, t, permissions, children }) {
  const [releaseOpen, setReleaseOpen] = useState(false);

  useAggregationHeartbeat({ enabled: true, intervalMs: 60000 });

  const [currentTime, setCurrentTime] = useState(new Date());

  const { locations, locationId, loading } = useServiceLocation();

  const { count } = usePatientCount({
    enabled: !loading && !!locationId,
    intervalMs: 60000,
    locationId,
  });

  const selectedColor = useMemo(() => {
    const loc = locations.find((l) => l.id === locationId);
    return loc?.background_color || null;
  }, [locations, locationId]);

  const fallbackSelectedColor = isAlfareroDev ? "#52c41a" : "#1890ff";
  const menuSelectedColor = selectedColor || fallbackSelectedColor;
  const location = useLocation();
  const isTurnoPage = location.pathname.startsWith("/turno");

  useEffect(() => {
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
    // IMPORTANT: use height (not minHeight) so we can constrain scrolling
    <Layout style={{ height: "100vh", width: "100%" }}>
      <CustomSider
        collapsedWidth="0"
        breakpoint="lg"
        hidden={ocultarMenu}
        isDev={isAlfareroDev}
        selectedColor={menuSelectedColor}
        // Keep the sider from participating in page scroll
        style={{ height: "100vh", position: "sticky", top: 0 }}
      >
        {/* Sider internal scroll (only if menu is tall) */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <SideNav t={t} permissions={permissions} />
        </div>

        <SiderFooter>
          <Divider
            style={{ margin: "8px 0", borderColor: "rgba(255,255,255,0.15)" }}
          />
          <Typography.Text
            onClick={() => setReleaseOpen(true)}
            style={{
              cursor: "pointer",
              opacity: 0.9,
              display: "inline-block",
              lineHeight: "1.4",
              padding: "4px 0",
            }}
            underline
          >
            V{t("version")}
          </Typography.Text>

          <ReleaseNotesModal
            open={releaseOpen}
            onClose={() => setReleaseOpen(false)}
          />
        </SiderFooter>
      </CustomSider>

      {/* Right side: TopBar stays fixed, only Content scrolls */}
      <RightColumn>
        <StickyTopBar>
          {!isTurnoPage && (
            <TopBar
              t={t}
              isDev={isAlfareroDev}
              formattedTime={formattedTime}
              count={count}
            />
          )}
        </StickyTopBar>

        <Content
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            margin: "24px 16px",
            padding: 24,
          }}
        >
          <AlertProvider>{children}</AlertProvider>
        </Content>
      </RightColumn>
    </Layout>
  );
}

AppShell.propTypes = {
  ocultarMenu: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
  permissions: PropTypes.object,
  children: PropTypes.node.isRequired,
};
