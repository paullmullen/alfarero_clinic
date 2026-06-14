// src/pages/AppointmentInput.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Space,
  Table,
  Typography,
  Upload,
  message,
  Tag,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import styled from "styled-components";
import * as XLSX from "xlsx";
import {
  collection,
  getDocs,
  doc,
  serverTimestamp,
  writeBatch,
  Timestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { auth, firestore } from "../helpers/firebaseConfig";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const Page = styled.div`
  padding: 16px;
`;

const ActionRowCard = styled(Card)`
  .ant-card-body {
    padding: 12px 16px;
  }
`;

function isRowCompletelyEmpty(row) {
  return !row.some((cell) => {
    if (cell === null || cell === undefined) return false;
    if (typeof cell === "string" && cell.trim() === "") return false;
    return true;
  });
}

function excelDateToJSDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(
      parsed.y,
      parsed.m - 1,
      parsed.d,
      parsed.H || 0,
      parsed.M || 0,
      parsed.S || 0,
    );
  }

  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function formatDateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeDate(value) {
  const d = excelDateToJSDate(value);
  if (!d) return "";
  return formatDateYYYYMMDD(d);
}

function normalizeTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hh = String(value.getHours()).padStart(2, "0");
    const mm = String(value.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    const hh = String(parsed.H || 0).padStart(2, "0");
    const mm = String(parsed.M || 0).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match) {
      const hh = String(Number(match[1])).padStart(2, "0");
      const mm = match[2];
      return `${hh}:${mm}`;
    }

    const d = new Date(`1970-01-01T${trimmed}`);
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }

  return "";
}

function combineDateAndTime(dateText, timeText) {
  if (!dateText || !timeText) return null;

  const combined = new Date(`${dateText}T${timeText}:00`);
  if (Number.isNaN(combined.getTime())) return null;

  return Timestamp.fromDate(combined);
}

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeKeyText(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, " ");
}

function buildAppointmentMatchKey({
  location,
  patientName,
  appointmentDateText,
  appointmentTimeText,
}) {
  return [
    normalizeKeyText(location),
    normalizeKeyText(patientName),
    normalizeKeyText(appointmentDateText),
    normalizeKeyText(appointmentTimeText),
  ].join("|");
}

function compareTextAsc(a, b) {
  return cleanText(a).localeCompare(cleanText(b), undefined, {
    sensitivity: "base",
  });
}

function sortAppointmentsForDisplay(appointments) {
  return [...appointments].sort((a, b) => {
    const byLocation = compareTextAsc(a.location, b.location);
    if (byLocation !== 0) return byLocation;

    const aTime =
      a.appointmentAt?.toDate?.()?.getTime?.() ?? Number.MAX_SAFE_INTEGER;
    const bTime =
      b.appointmentAt?.toDate?.()?.getTime?.() ?? Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) return aTime - bTime;

    const byVisitType = compareTextAsc(a.visitType, b.visitType);
    if (byVisitType !== 0) return byVisitType;

    return compareTextAsc(a.patientName, b.patientName);
  });
}

function buildAppointmentFromRow(row, rowNumber, fileName) {
  const appointmentDateText = normalizeDate(row[8]);
  const appointmentTimeText = normalizeTime(row[9]);
  const appointmentAt = combineDateAndTime(
    appointmentDateText,
    appointmentTimeText,
  );

  const record = {
    location: cleanText(row[0]),
    patientName: cleanText(row[1]),
    dpi: cleanText(row[2]),
    ageGroup: cleanText(row[3]),
    gender: cleanText(row[4]),
    phoneNumber: cleanText(row[5]),
    reasonForVisit: cleanText(row[6]),
    visitType: cleanText(row[7]),

    appointmentDateText,
    appointmentTimeText,
    appointmentAt,

    appointmentMatchKey: buildAppointmentMatchKey({
      location: cleanText(row[0]),
      patientName: cleanText(row[1]),
      appointmentDateText,
      appointmentTimeText,
    }),

    source: "excel_upload",
    importFileName: fileName,
    importRowNumber: rowNumber,
  };

  const importIssues = [];

  if (!record.location) importIssues.push("missing_location");
  if (!record.patientName) importIssues.push("missing_patientName");
  if (!record.ageGroup) importIssues.push("missing_ageGroup");
  if (!record.gender) importIssues.push("missing_gender");
  if (!record.reasonForVisit) importIssues.push("missing_reasonForVisit");
  if (!record.visitType) importIssues.push("missing_visitType");
  if (!record.appointmentDateText) {
    importIssues.push("missing_appointmentDateText");
  }
  if (!record.appointmentTimeText) {
    importIssues.push("missing_appointmentTimeText");
  }

  if (
    record.ageGroup &&
    !["Adulto", "Niño", "Nino"].includes(record.ageGroup)
  ) {
    importIssues.push("invalid_ageGroup");
  }

  if (record.gender && !["Masculino", "Femenina"].includes(record.gender)) {
    importIssues.push("invalid_gender");
  }

  if (!record.appointmentAt) {
    importIssues.push("invalid_datetime");
  }

  return {
    ...record,
    importIssues,
    isValidBasic: importIssues.length === 0,
  };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function AppointmentInput() {
  const [t] = useTranslation("global");
  const ti = (key, options) => t(`appointmentImport.${key}`, options);

  const templateUrl = process.env.REACT_APP_APPOINTMENT_TEMPLATE_URL;

  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [loadingParse, setLoadingParse] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [validLocationSet, setValidLocationSet] = useState(new Set());

  const [existingAppointments, setExistingAppointments] = useState([]);
  const [loadingExistingAppointments, setLoadingExistingAppointments] =
    useState(true);

  useEffect(() => {
    const now = Timestamp.now();

    const q = query(
      collection(firestore, "appointments"),
      where("appointmentAt", ">=", now),
      orderBy("appointmentAt", "asc"),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const upcoming = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();

            const appointmentDateText =
              data.appointmentDateText ||
              (data.appointmentAt?.toDate
                ? formatDateYYYYMMDD(data.appointmentAt.toDate())
                : "");

            const appointmentTimeText =
              data.appointmentTimeText ||
              (data.appointmentAt?.toDate
                ? `${String(data.appointmentAt.toDate().getHours()).padStart(
                    2,
                    "0",
                  )}:${String(
                    data.appointmentAt.toDate().getMinutes(),
                  ).padStart(2, "0")}`
                : "");

            return {
              id: docSnap.id,
              ...data,
              appointmentDateText,
              appointmentTimeText,
              appointmentMatchKey:
                data.appointmentMatchKey ||
                buildAppointmentMatchKey({
                  location: data.location,
                  patientName: data.patientName,
                  appointmentDateText,
                  appointmentTimeText,
                }),
            };
          })
          .filter((item) => {
            const cancelled =
              item.cancelled === true ||
              item.status === "cancelled" ||
              !!item.cancelledAt;

            const admitted =
              item.status === "admitted" ||
              !!item.admittedAt ||
              !!item.admitted_patient_id;

            const noLongerOperational = cancelled || admitted;

            return !noLongerOperational;
          });

        setExistingAppointments(sortAppointmentsForDisplay(upcoming));
        setLoadingExistingAppointments(false);
      },
      (error) => {
        console.error(error);
        setExistingAppointments([]);
        setLoadingExistingAppointments(false);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const snapshot = await getDocs(collection(firestore, "locations"));

        const names = snapshot.docs
          .map((doc) => doc.data()?.name)
          .filter(Boolean)
          .map((name) => name.trim().toLowerCase());

        setValidLocationSet(new Set(names));
      } catch (err) {
        console.error("Error loading locations", err);
      }
    };

    loadLocations();
  }, []);

  const existingAppointmentKeySet = useMemo(
    () =>
      new Set(
        existingAppointments
          .map((item) => item.appointmentMatchKey)
          .filter(Boolean),
      ),
    [existingAppointments],
  );

  const analyzedRows = useMemo(() => {
    const keyCounts = parsedRows.reduce((acc, row) => {
      if (!row.appointmentMatchKey) return acc;
      acc[row.appointmentMatchKey] = (acc[row.appointmentMatchKey] || 0) + 1;
      return acc;
    }, {});

    const nowMs = Date.now();

    return parsedRows.map((row) => {
      const extraIssues = [];

      if (row.appointmentAt?.toDate) {
        const rowMs = row.appointmentAt.toDate().getTime();
        if (rowMs < nowMs) {
          extraIssues.push("appointment_in_past");
        }
      }

      if (row.appointmentMatchKey && keyCounts[row.appointmentMatchKey] > 1) {
        extraIssues.push("duplicate_in_upload");
      }

      if (
        row.appointmentMatchKey &&
        existingAppointmentKeySet.has(row.appointmentMatchKey)
      ) {
        extraIssues.push("duplicate_existing");
      }

      if (
        row.location &&
        !validLocationSet.has(row.location.trim().toLowerCase())
      ) {
        extraIssues.push("invalid_location");
      }

      const combinedIssues = [...row.importIssues, ...extraIssues];
      const uniqueIssues = [...new Set(combinedIssues)];

      return {
        ...row,
        importIssues: uniqueIssues,
        isImportReady: uniqueIssues.length === 0,
      };
    });
  }, [parsedRows, existingAppointmentKeySet, validLocationSet]);

  const summary = useMemo(() => {
    const total = analyzedRows.length;
    const ready = analyzedRows.filter((r) => r.isImportReady).length;
    const withIssues = total - ready;
    return { total, ready, withIssues };
  }, [analyzedRows]);

  const previewColumns = [
    {
      title: ti("columns.row"),
      dataIndex: "importRowNumber",
      key: "importRowNumber",
      width: 80,
    },
    {
      title: ti("columns.location"),
      dataIndex: "location",
      key: "location",
      width: 140,
    },
    {
      title: ti("columns.name"),
      dataIndex: "patientName",
      key: "patientName",
      width: 220,
    },
    {
      title: ti("columns.visitType"),
      dataIndex: "visitType",
      key: "visitType",
      width: 160,
    },
    {
      title: ti("columns.date"),
      dataIndex: "appointmentDateText",
      key: "appointmentDateText",
      width: 120,
    },
    {
      title: ti("columns.time"),
      dataIndex: "appointmentTimeText",
      key: "appointmentTimeText",
      width: 100,
    },
    {
      title: ti("columns.status"),
      key: "status",
      width: 130,
      render: (_, record) =>
        record.isImportReady ? (
          <Tag color="green">{ti("status.ok")}</Tag>
        ) : (
          <Tag color="orange">{ti("status.review")}</Tag>
        ),
    },
    {
      title: ti("columns.issues"),
      key: "issues",
      render: (_, record) =>
        record.importIssues?.length
          ? record.importIssues.map((issue) => ti(`issues.${issue}`)).join(", ")
          : "",
    },
  ];

  const existingAppointmentsColumns = [
    {
      title: ti("columns.location"),
      dataIndex: "location",
      key: "location",
      width: 140,
    },
    {
      title: ti("columns.date"),
      dataIndex: "appointmentDateText",
      key: "appointmentDateText",
      width: 120,
    },
    {
      title: ti("columns.time"),
      dataIndex: "appointmentTimeText",
      key: "appointmentTimeText",
      width: 100,
    },
    {
      title: ti("columns.visitType"),
      dataIndex: "visitType",
      key: "visitType",
      width: 160,
    },
    {
      title: ti("columns.name"),
      dataIndex: "patientName",
      key: "patientName",
      width: 220,
    },
  ];

  const handleFile = async (file) => {
    try {
      setLoadingParse(true);
      setParsedRows([]);
      setFileName(file.name);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const sheet =
        workbook.Sheets["Reservaciones"] ||
        workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) {
        throw new Error("Could not find worksheet");
      }

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: "",
      });

      const dataRows = rows.slice(3);

      const normalized = dataRows
        .map((row, index) => ({
          row,
          rowNumber: index + 4,
        }))
        .filter(({ row }) => !isRowCompletelyEmpty(row))
        .map(({ row, rowNumber }) =>
          buildAppointmentFromRow(row, rowNumber, file.name),
        );

      setParsedRows(normalized);
      message.success(
        ti("messages.parsedRows", {
          count: normalized.length,
        }),
      );
    } catch (error) {
      console.error(error);
      message.error(ti("messages.readError"));
    } finally {
      setLoadingParse(false);
    }

    return false;
  };

  const handleImport = async () => {
    if (!analyzedRows.length) {
      message.warning(ti("messages.noRows"));
      return;
    }

    const importableRows = analyzedRows.filter((r) => r.isImportReady);

    if (!importableRows.length) {
      message.error(ti("messages.noValidRows"));
      return;
    }

    try {
      setLoadingImport(true);

      const currentUser = auth.currentUser;

      const rowsToWrite = importableRows.map((row) => ({
        ...row,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid || "",
      }));

      const chunks = chunkArray(rowsToWrite, 400);

      for (const chunk of chunks) {
        const batch = writeBatch(firestore);

        chunk.forEach((row) => {
          const ref = doc(collection(firestore, "appointments"));
          batch.set(ref, row);
        });

        await batch.commit();
      }

      const skipped = analyzedRows.length - importableRows.length;

      if (skipped > 0) {
        message.warning(
          ti("messages.importedWithSkipped", {
            imported: importableRows.length,
            skipped,
          }),
        );
      } else {
        message.success(
          ti("messages.importedRows", {
            count: importableRows.length,
          }),
        );
      }

      setParsedRows([]);
      setFileName("");
    } catch (error) {
      console.error(error);
      message.error(ti("messages.importFailed"));
    } finally {
      setLoadingImport(false);
    }
  };

  const handleClear = () => {
    setParsedRows([]);
    setFileName("");
  };

  return (
    <Page>
      <Card>
        <Title level={3} style={{ marginTop: 0 }}>
          {ti("title")}
        </Title>

        <Space orientation="vertical" style={{ width: "100%" }} size="middle">
          <Text>{ti("description")}</Text>

          <ActionRowCard size="small">
            <Space
              style={{
                width: "100%",
                justifyContent: "space-between",
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <Space wrap>
                <Button
                  type="default"
                  href={templateUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  disabled={!templateUrl}
                >
                  {ti("upload.downloadTemplate")}
                </Button>

                {fileName ? (
                  <Tag color="blue">
                    {ti("upload.selectedFile")}: {fileName}
                  </Tag>
                ) : (
                  <Text type="secondary">{ti("upload.noFileSelected")}</Text>
                )}
              </Space>

              <Text type="secondary">{ti("upload.supportedFiles")}</Text>
            </Space>
          </ActionRowCard>

          <Dragger
            accept=".xlsx,.xls"
            beforeUpload={handleFile}
            showUploadList={false}
            maxCount={1}
            disabled={loadingParse || loadingImport}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{ti("upload.clickOrDrag")}</p>
            <p className="ant-upload-hint">{ti("upload.dragHint")}</p>
          </Dragger>

          {!!analyzedRows.length && (
            <>
              <Card size="small">
                <Space size="large" wrap>
                  <Text>
                    <strong>{ti("summary.total")}:</strong> {summary.total}
                  </Text>
                  <Text>
                    <strong>{ti("summary.validBasic")}:</strong> {summary.ready}{" "}
                    ({ti("summary.willImport")})
                  </Text>
                  <Text>
                    <strong>{ti("summary.needsReview")}:</strong>{" "}
                    {summary.withIssues}
                  </Text>
                </Space>
              </Card>

              {summary.withIssues > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message={ti("alert.title")}
                  description={ti("alert.description")}
                />
              )}

              <Table
                rowKey={(record) =>
                  `${record.importRowNumber}-${record.patientName}-${record.visitType}`
                }
                columns={previewColumns}
                dataSource={analyzedRows}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1100 }}
                size="small"
              />

              <Space>
                <Button
                  type="primary"
                  onClick={handleImport}
                  loading={loadingImport}
                >
                  {ti("buttons.import")}
                </Button>

                <Button onClick={handleClear} disabled={loadingImport}>
                  {ti("buttons.clear")}
                </Button>
              </Space>
            </>
          )}

          <Card
            size="small"
            title={t("appointmentImport.existingAppointments.title")}
          >
            <Text type="secondary">
              {t("appointmentImport.existingAppointments.description")}
            </Text>

            <div style={{ marginTop: 12 }}>
              <Table
                rowKey="id"
                columns={existingAppointmentsColumns}
                dataSource={existingAppointments}
                loading={loadingExistingAppointments}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 900 }}
                size="small"
                locale={{
                  emptyText: t("appointmentImport.existingAppointments.empty"),
                }}
              />
            </div>
          </Card>
        </Space>
      </Card>
    </Page>
  );
}
