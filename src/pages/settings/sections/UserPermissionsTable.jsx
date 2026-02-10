import React, { useMemo } from "react";
import { Table, Switch, Typography } from "antd";

const { Title } = Typography;

export default function UserPermissionsTable({
  users,
  permissionKeys,
  onChangePermission,
  t,
}) {
  const label = (key, fallback) => {
    if (!t) return fallback ?? key;
    const v = t(key);
    // i18next commonly returns the key itself when missing
    return v && v !== key ? v : (fallback ?? key);
  };

  const columns = useMemo(() => {
    return [
      {
        title: label("common.name", "Name"),
        dataIndex: "name",
        key: "name",
        fixed: "left",
        width: 200,
      },
      {
        title: label("common.email", "Email"),
        dataIndex: "email",
        key: "email",
        width: 260,
      },
      ...permissionKeys.map((permKey) => ({
        title: label(`permissions.${permKey}`, permKey),
        dataIndex: "permissions",
        key: permKey,
        width: 160,
        render: (_, record) => {
          const value =
            typeof record.permissions === "object" &&
            record.permissions !== null
              ? !!record.permissions[permKey]
              : false;

          return (
            <Switch
              checked={value}
              onChange={(val) => onChangePermission(record.id, permKey, val)}
            />
          );
        },
      })),
    ];
  }, [permissionKeys, onChangePermission, t]);

  return (
    <>
      <Title level={3}>
        {label("settings.userPermissions.title", "User Permissions")}
      </Title>

      <Table
        size="middle"
        rowKey="id"
        dataSource={users}
        pagination={{ pageSize: 8 }}
        columns={columns}
        scroll={{ x: 800 }}
      />
    </>
  );
}
