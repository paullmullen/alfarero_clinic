import React from "react";
import { Table, Switch, Typography } from "antd";

const { Title } = Typography;

export default function UserPermissionsTable({
  users,
  permissionKeys,
  onChangePermission,
  t,
}) {
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 200,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 260,
    },
    ...permissionKeys.map((key) => ({
      title: key,
      dataIndex: "permissions",
      key,
      width: 160,
      render: (_, record) => {
        const value =
          typeof record.permissions === "object" &&
          record.permissions !== null
            ? !!record.permissions[key]
            : false;

        return (
          <Switch
            checked={value}
            onChange={(val) => onChangePermission(record.id, key, val)}
          />
        );
      },
    })),
  ];

  return (
    <>
      <Title level={3}>{t("USER_PERMISSIONS") || "User Permissions"}</Title>

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