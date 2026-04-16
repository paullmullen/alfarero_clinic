import React from "react";
import {
  Upload,
  Alert,
  Table,
  Button,
  Progress,
  Space,
  Typography,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { useKnownPatientsUploader } from "../hooks/useKnownPatientsUploader";
import { useTranslation } from "react-i18next";

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;

export default function KnownPatientsUploader() {
  const { rows, parseError, handleFile, upload, reset, loading, progress } =
    useKnownPatientsUploader();

  const columns = [
    {
      title: "DPI",
      dataIndex: "id",
      key: "id",
      render: (v) => {
        if (!v) return <Text type="secondary">—</Text>;
        const str = String(v);

        // Only format if exactly 13 digits
        if (/^\d{13}$/.test(str)) {
          return `${str.slice(0, 4)} ${str.slice(4, 9)} ${str.slice(9, 13)}`;
        }

        // Otherwise just show raw value (or blank)
        return str;
      },
    },
    { title: "Name", dataIndex: "patient_name", key: "name" },
    { title: "Gender", dataIndex: "gender", key: "gender" },
    { title: "Age", dataIndex: "age_group", key: "age_group" },
    { title: "Telephone", dataIndex: "telephone", key: "telephone" },
    {
      title: "Status",
      dataIndex: "error",
      key: "status",
      render: (err) =>
        err ? (
          <Text type="danger">{err}</Text>
        ) : (
          <Text type="success">Ready</Text>
        ),
    },
  ];
  const [t] = useTranslation("global");
  return (
    <>
      <Title level={3}>{t("UPLOAD_KNOWN_PATIENTS")}</Title>

      <Paragraph>
        Upload a CSV or Excel with <b>DPI, Nombre</b>,<b>Género</b>, <b>Edad</b>
        , and optional <b>Telephono</b>. DPI is case‑insensitive.
      </Paragraph>

      {parseError && (
        <Alert
          type="error"
          showIcon
          message={parseError}
          style={{ marginBottom: 12 }}
        />
      )}

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message={t("OVERWRITES_DATA")}
      />

      <Dragger
        multiple={false}
        maxCount={1}
        accept=".csv,.xlsx,.xls"
        beforeUpload={(file) => {
          handleFile(file);
          return false;
        }}
        showUploadList={false}
        style={{ background: "#fff" }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t("CLICKORDRAGFILE")}</p>
        <p className="ant-upload-hint">
          DPI (13 digits), Nombre, Género, Edad.
        </p>
      </Dragger>

      {rows.length > 0 && (
        <>
          <Alert
            type={rows.some((r) => r.error) ? "warning" : "success"}
            showIcon
            message={
              rows.some((r) => r.error)
                ? `${rows.length} rows parsed • ${
                    rows.filter((r) => !r.error).length
                  } valid • ${rows.filter((r) => r.error).length} with issues`
                : `${rows.length} rows parsed • All valid`
            }
            style={{ marginTop: 16 }}
          />

          <Table
            rowKey="key"
            style={{ marginTop: 16 }}
            dataSource={rows}
            columns={columns}
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />

          <Space style={{ marginTop: 12 }}>
            <Button
              type="primary"
              onClick={upload}
              disabled={!rows.some((r) => !r.error) || loading}
              loading={loading}
            >
              {t("UPLOAD")}
            </Button>
            <Button onClick={reset} disabled={loading}>
              Reset
            </Button>
          </Space>

          {loading && (
            <div style={{ marginTop: 12, maxWidth: 360 }}>
              <Progress
                percent={
                  progress.total
                    ? Math.round((progress.current / progress.total) * 100)
                    : 0
                }
                status="active"
              />
              <Text type="secondary">
                {progress.current}/{progress.total}
              </Text>
            </div>
          )}
        </>
      )}
    </>
  );
}
