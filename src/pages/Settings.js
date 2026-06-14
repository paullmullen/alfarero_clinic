/* eslint-disable */
import React, { Component, useMemo, useRef } from "react";
import { Typography, Card, Space, Button, Divider } from "antd";
import { useTranslation } from "react-i18next";
import {
  SettingOutlined,
  DeploymentUnitOutlined,
  SafetyCertificateOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { useHideMenu } from "../hooks/useHideMenu";

import StationsMaxWait from "./settings/sections/StationsMaxWait";
import LocationsManager from "./settings/sections/LocationsManager";
import UserPermissionsTable from "./settings/sections/UserPermissionsTable";
import InviteEmailForm from "./settings/sections/InviteEmailForm";
import KnownPatientsUploader from "./settings/sections/KnownPatientsUploader";
import OrganizationsManager from "./settings/sections/OrganizationsManagter";
import VisitTypesManager from "./settings/sections/VisitTypesManager";
import ScannerQrGenerator from "./settings/sections/ScannerQRGenerator";

import { useStations } from "./settings/hooks/useStations";
import { useLocations } from "./settings/hooks/useLocations";
import { useUsersWithPermissions } from "./settings/hooks/useUsersWithPermissions";

const { Title, Paragraph, Text } = Typography;

/** Error Boundary to catch rendering issues */
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          Error loading component. Please try again.
        </div>
      );
    }
    return this.props.children;
  }
}

const JumpNav = ({ sections, onJump }) => {
  const [t] = useTranslation("global");

  return (
    <Card
      size="small"
      style={{
        position: "sticky",
        top: 8,
        zIndex: 10,
        marginBottom: 24,
        borderRadius: 12,
      }}
      bodyStyle={{ padding: 16 }}
    >
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <Text strong type="primary" style={{ fontSize: 24 }}>
          {t("SETTINGS_JUMP_TO")}
        </Text>

        <Space wrap>
          {sections.map((section) => (
            <Button
              key={section.key}
              icon={section.icon}
              onClick={() => onJump(section.key)}
            >
              {section.label}
            </Button>
          ))}
        </Space>
      </Space>
    </Card>
  );
};

const SectionBlock = React.forwardRef(
  ({ title, description, children, extra }, ref) => {
    return (
      <section ref={ref} style={{ marginBottom: 24 }}>
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <Space
              align="start"
              style={{
                width: "100%",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <Title level={2} style={{ marginBottom: 8 }}>
                  {title}
                </Title>

                {description ? (
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    {description}
                  </Paragraph>
                ) : null}
              </div>

              {extra || null}
            </Space>
          </div>

          {children}
        </Card>
      </section>
    );
  },
);

SectionBlock.displayName = "SectionBlock";

const Settings = () => {
  const { stations, updateMaxWait } = useStations();
  const { locations, updateLocation, addLocation } = useLocations();
  const { users, permissionKeys, updatePermission } = useUsersWithPermissions();
  const [t] = useTranslation("global");

  useHideMenu(false);

  const clinicRef = useRef(null);
  const scannerRef = useRef(null);
  const usersRef = useRef(null);
  const dataRef = useRef(null);
  const organizationsRef = useRef(null);

  const sectionRefs = useMemo(
    () => ({
      clinic: clinicRef,
      organizations: organizationsRef,
      scanner: scannerRef,
      users: usersRef,
      data: dataRef,
    }),
    [],
  );

  const jumpSections = [
    {
      key: "clinic",
      label: t("SETTINGS_GROUP_CLINIC") || "Clinic Configuration",
      icon: <SettingOutlined />,
    },
    {
      key: "organizations",
      label: t("organizations") || "Organizations",
      icon: <DatabaseOutlined />,
    },
    {
      key: "scanner",
      label: t("SETTINGS_GROUP_SCANNER") || "Scanner System",
      icon: <DeploymentUnitOutlined />,
    },
    {
      key: "users",
      label: t("SETTINGS_GROUP_USERS") || "Users & Access",
      icon: <SafetyCertificateOutlined />,
    },
    {
      key: "data",
      label: t("SETTINGS_GROUP_DATA") || "Data & Imports",
      icon: <DatabaseOutlined />,
    },
  ];

  const handleJump = (key) => {
    sectionRefs[key]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <ErrorBoundary>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={1} style={{ marginBottom: 8 }}>
            {t("SETTINGS") || "Settings"}
          </Title>
        </div>

        <JumpNav sections={jumpSections} onJump={handleJump} />

        <SectionBlock
          ref={clinicRef}
          title={t("SETTINGS_GROUP_CLINIC") || "Clinic Configuration"}
          description={
            t("SETTINGS_GROUP_CLINIC_DESCRIPTION") ||
            "Manage the structure of clinic operations, including stations, service locations, and default plans of care."
          }
        >
          <Space orientation="vertical" size={24} style={{ width: "100%" }}>
            <StationsMaxWait stations={stations} onUpdate={updateMaxWait} />

            <Divider style={{ margin: 0 }} />

            <LocationsManager
              locations={locations}
              onUpdate={updateLocation}
              onAddLocation={addLocation}
              stations={stations}
              t={t}
            />

            <Divider style={{ margin: 0 }} />

            <div ref={organizationsRef}>
              <OrganizationsManager t={t} />
            </div>

            <Divider style={{ margin: 0 }} />

            <VisitTypesManager stations={stations} t={t} />
          </Space>
        </SectionBlock>

        <SectionBlock
          ref={scannerRef}
          title={t("SETTINGS_GROUP_SCANNER") || "Scanner System"}
          description={
            t("SETTINGS_GROUP_SCANNER_DESCRIPTION") ||
            "Generate and print QR codes used to configure scanner devices."
          }
        >
          <ScannerQrGenerator
            stations={stations}
            locations={locations}
            t={t}
          />{" "}
        </SectionBlock>

        <SectionBlock
          ref={usersRef}
          title={t("SETTINGS_GROUP_USERS") || "Users & Access"}
          description={
            t("SETTINGS_GROUP_USERS_DESCRIPTION") ||
            "Control permissions and send invitations for system access."
          }
        >
          <Space orientation="vertical" size={24} style={{ width: "100%" }}>
            <UserPermissionsTable
              users={users}
              permissionKeys={permissionKeys}
              onChangePermission={updatePermission}
              t={t}
            />
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t("MANAGER_DESCRIPTION") ||
                "Manager settings for stations, locations, visit types, users, and known patients."}
            </Paragraph>

            <Divider style={{ margin: 0 }} />

            <InviteEmailForm t={t} />
          </Space>
        </SectionBlock>

        <SectionBlock
          ref={dataRef}
          title={t("SETTINGS_GROUP_DATA") || "Data & Imports"}
          description={
            t("SETTINGS_GROUP_DATA_DESCRIPTION") ||
            "Run bulk import and maintenance tools for patient-related data."
          }
        >
          <KnownPatientsUploader />
        </SectionBlock>
      </div>
    </ErrorBoundary>
  );
};

export default Settings;
