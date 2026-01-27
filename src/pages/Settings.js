/* eslint-disable */
import React, { Component } from "react";
import { Typography, Divider } from "antd";
import { useTranslation } from "react-i18next";
import { useHideMenu } from "../hooks/useHideMenu";

import StationsMaxWait from "./settings/sections/StationsMaxWait";
import LocationsManager from "./settings/sections/LocationsManager";
import UserPermissionsTable from "./settings/sections/UserPermissionsTable";
import InviteEmailForm from "./settings/sections/InviteEmailForm";
import KnownPatientsUploader from "./settings/sections/KnownPatientsUploader";

import { useStations } from "./settings/hooks/useStations";
import { useLocations } from "./settings/hooks/useLocations";
import { useUsersWithPermissions } from "./settings/hooks/useUsersWithPermissions";

const { Paragraph } = Typography;

/** Error Boundary to catch rendering issues */
class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      // You can also render a styled fallback, logging, etc.
      return (
        <div style={{ padding: 16 }}>
          Error loading component. Please try again.
        </div>
      );
    }
    return this.props.children;
  }
}

const Settings = () => {
  const { stations, updateMaxWait } = useStations();
  const { locations, updateLocation, addLocation } = useLocations();
  const { users, permissionKeys, updatePermission } = useUsersWithPermissions();
  const [t] = useTranslation("global");

  useHideMenu(false);

  return (
    <ErrorBoundary>
      <div style={{ padding: 16 }}>
        {/* STATIONS */}
        <StationsMaxWait stations={stations} onUpdate={updateMaxWait} />
        <br />
        <br />
        <Divider />

        {/* LOCATIONS */}
        <LocationsManager
          locations={locations}
          onUpdate={updateLocation}
          onAddLocation={addLocation}
          stations={stations}
          t={t}
        />
        <br />
        <br />
        <Divider />

        {/* USER PERMISSIONS */}
        <UserPermissionsTable
          users={users}
          permissionKeys={permissionKeys}
          onChangePermission={updatePermission}
          t={t}
        />
        <Paragraph type="secondary">
          {t("MANAGER_DESCRIPTION") ||
            "Manager settings for stations, locations, users, and known patients."}
        </Paragraph>
        {/* INVITE EMAIL */}
        <InviteEmailForm t={t} />
        <br />
        <br />
        <Divider />

        <KnownPatientsUploader />
        <br />
        <br />
      </div>
    </ErrorBoundary>
  );
};

export default Settings;
``;
