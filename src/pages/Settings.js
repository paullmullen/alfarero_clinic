/* eslint-disable */
import React, { useEffect, useState, Suspense, Component } from "react";
import {
  Input,
  InputNumber,
  Typography,
  Divider,
  Row,
  Col,
  Select,
  Button,
  Switch,
  Table,
  Form,
  message,
  Upload,
  Alert,
  Progress,
  Space,
} from "antd";
import { HexColorPicker } from "react-colorful";
import { firestore } from "../helpers/firebaseConfig";
import { useTranslation } from "react-i18next";
import { useHideMenu } from "../hooks/useHideMenu";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  Timestamp,
  query,
  orderBy,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import axios from "axios";
import LocationPicker from "../components/LocationPicker";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { InboxOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

/** Error Boundary to catch rendering issues */
class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Alert
          type="error"
          showIcon
          message="Error loading component. Please try again."
        />
      );
    }
    return this.props.children;
  }
}

const Settings = () => {
  const [t] = useTranslation("global");
  const [form] = Form.useForm();

  const [stations, setStations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState([]);
  const [loading, setLoading] = useState(false);

  // -------------------------
  // Fetch STATIONS (from "stats")
  // -------------------------
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const statsRef = collection(firestore, "stats");
        const snapshot = await getDocs(statsRef);
        const stationData = snapshot.docs.map((d) => ({
          id: d.id,
          name: t(d.id),
          max_waiting_time: d.data().max_waiting_time ?? 0,
          ...d.data(),
        }));
        setStations(stationData);
      } catch (error) {
        console.error("Error fetching stations:", error);
      }
    };
    fetchStations();
  }, [t]);

  // -------------------------
  // Fetch LOCATIONS (from "locations")
  // -------------------------
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationsRef = collection(firestore, "locations");
        const snapshot = await getDocs(locationsRef);
        const locationData = snapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          stations: d.data().stations ?? [],
          background_color: d.data().background_color ?? "#ffffff",
          latitude: d.data().latitude ?? 0,
          longitude: d.data().longitude ?? 0,
        }));
        setLocations(locationData);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    fetchLocations();
  }, []);

  // -------------------------
  // Fetch USERS (from "users") live
  // -------------------------
  useEffect(() => {
    const usersRef = collection(firestore, "users");
    const usersQuery = query(usersRef, orderBy("name", "asc"));
    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const userData = snapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? "Unknown",
          email: d.data().email ?? "Unknown",
          permissions:
            d.data().permissions && typeof d.data().permissions === "object"
              ? d.data().permissions
              : {},
        }));
        setUsers(userData);
      },
      (error) => {
        console.error("Error fetching users:", error);
      },
    );
    return () => unsubscribe();
  }, []);

  // Extract all permission keys present across users
  useEffect(() => {
    const all = new Set();
    users.forEach((u) => {
      Object.keys(u.permissions ?? {}).forEach((k) => all.add(k));
    });
    setPermissionKeys(Array.from(all).sort());
  }, [users]);

  // -------------------------
  // Handlers: Stations, Locations, Permissions
  // -------------------------
  const handlePermissionChange = async (userId, permissionKey, newValue) => {
    try {
      const userRef = doc(firestore, "users", userId);
      const updatedTimestamp = Timestamp.now();
      await updateDoc(userRef, {
        [`permissions.${permissionKey}`]: newValue,
        updated: updatedTimestamp,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                permissions: { ...u.permissions, [permissionKey]: newValue },
                updated: updatedTimestamp,
              }
            : u,
        ),
      );
    } catch (error) {
      console.error("Error updating permissions:", error);
    }
  };

  const handleLocationUpdate = async (locationId, key, value) => {
    try {
      const locationDocRef = doc(firestore, "locations", locationId);
      await updateDoc(locationDocRef, { [key]: value });
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === locationId ? { ...loc, [key]: value } : loc,
        ),
      );
    } catch (error) {
      console.error(`Error updating ${key} for location:`, error);
    }
  };

  const handleMaxTimeUpdate = async (stationId, value) => {
    try {
      const ref = doc(firestore, "stats", stationId);
      await updateDoc(ref, { max_waiting_time: value });
      setStations((prev) =>
        prev.map((s) =>
          s.id === stationId ? { ...s, max_waiting_time: value } : s,
        ),
      );
    } catch (error) {
      console.error("Error updating waiting_time:", error);
    }
  };

  const handleAddLocation = async () => {
    try {
      const newLocation = {
        name: "New Location",
        background_color: "#ffffff",
        stations: [],
        latitude: 14.6232421,
        longitude: -90.5304184,
      };
      const docRef = await addDoc(
        collection(firestore, "locations"),
        newLocation,
      );
      setLocations([...locations, { id: docRef.id, ...newLocation }]);
    } catch (error) {
      console.error("Error adding new location:", error);
    }
  };

  // -------------------------
  // Email Invite form
  // -------------------------
  const sendEmail = async (values) => {
    setLoading(true);
    try {
      const messageDocRef = doc(firestore, "signupMessage", "email_message");
      const messageDoc = await getDoc(messageDocRef);
      if (!messageDoc.exists()) {
        message.error(
          t("EMAIL_MESSAGE_NOT_FOUND") || "Email message template not found",
        );
        setLoading(false);
        return;
      }
      const { text, subjectLine } = messageDoc.data();
      const response = await axios.post(
        "https://sendemail-479287307088.us-central1.run.app",
        { to: values.email, subject: subjectLine, html: text },
        { headers: { "Content-Type": "application/json" } },
      );
      if (response.status === 200) {
        message.success(t("EMAIL_SENT_SUCCESS") || "Email sent");
        form.resetFields();
      } else {
        message.error(t("EMAIL_SEND_ERROR") || "Error sending email");
      }
    } catch (error) {
      message.error(
        `${t("EMAIL_SEND_ERROR") || "Error sending email"}: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Known Patients Upload (UPDATED)
  // -------------------------
  const [kpRows, setKpRows] = useState([]);
  const [kpLoading, setKpLoading] = useState(false);
  const [kpProgress, setKpProgress] = useState({ current: 0, total: 0 });
  const [kpParseError, setKpParseError] = useState(null);

  // Case-insensitive column name normalization
  const normalizeKey = (key) => (key ?? "").toString().trim().toLowerCase();
  const getValueCI = (row, targetName) => {
    const target = normalizeKey(targetName);
    for (const k of Object.keys(row)) {
      if (normalizeKey(k) === target) return row[k];
    }
    return undefined;
  };

  // ID helpers
  const cleanId = (raw) =>
    (raw ?? "").toString().replace(/\D/g, "").slice(0, 13);
  const isValid13 = (digits) => /^\d{13}$/.test(digits);

  // Age parsing (from dd/mm/yyyy or numeric)
  const parseAgeYears = (raw) => {
    const txt = (raw ?? "").toString().trim();
    if (!txt) return null;

    // dd/mm/yyyy
    const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const [, d, mo, y] = m;
      const yyyy = y.length === 2 ? (Number(y) > 30 ? `19${y}` : `20${y}`) : y;
      const birth = new Date(
        `${yyyy.toString().padStart(4, "0")}-${mo.toString().padStart(2, "0")}-${d
          .toString()
          .padStart(2, "0")}`,
      );
      if (!isNaN(birth)) {
        const today = new Date();
        let years = today.getFullYear() - birth.getFullYear();
        const beforeBirthday =
          today.getMonth() < birth.getMonth() ||
          (today.getMonth() === birth.getMonth() &&
            today.getDate() < birth.getDate());
        if (beforeBirthday) years -= 1;
        return Math.max(0, years);
      }
    }

    // Pure numeric age
    const n = Number(txt.replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const inferAgeGroup = (years) =>
    years !== null && years < 18 ? "child" : "adult";

  // Phone: normalize to digits; if 8 digits, prefix with '502'.
  const normalizePhone = (raw) => {
    const digits = (raw ?? "").toString().replace(/\D/g, "");
    if (!digits) return null;
    if (digits.length === 8) return `502${digits}`; // local -> country prefixed
    if (digits.length === 11 && digits.startsWith("502")) return digits; // already country prefixed
    // Keep cleaned digits for other lengths (we avoid guessing formats)
    return digits;
  };

  // Normalize rows from uploaded sheet (adds telephone)
  const kpNormalizeRows = (data) =>
    data.map((row, idx) => {
      const rawDpi = getValueCI(row, "dpi"); // case-insensitive DPI
      const id = cleanId(rawDpi);

      const rawName =
        getValueCI(row, "nombre") ??
        getValueCI(row, "patient_name") ??
        getValueCI(row, "name");
      const patient_name = (rawName ?? "").toString().trim();

      const rawGender = getValueCI(row, "género") ?? getValueCI(row, "genero");
      let gender = null;
      if (rawGender) {
        const gtxt = rawGender.toString().trim().toLowerCase();
        if (
          gtxt.startsWith("m") ||
          ["masculino", "male", "hombre"].includes(gtxt)
        )
          gender = "masculine";
        else if (
          gtxt.startsWith("f") ||
          ["femenino", "female", "mujer"].includes(gtxt)
        )
          gender = "feminine";
      }

      const rawEdad = getValueCI(row, "edad");
      const years = parseAgeYears(rawEdad);
      const age_group = years !== null ? inferAgeGroup(years) : null;

      // Telephone column (sheet uses 'telephono'; also accept common variants)
      const rawPhone =
        getValueCI(row, "telephono") ??
        getValueCI(row, "telefono") ??
        getValueCI(row, "teléfono") ??
        getValueCI(row, "phone");
      const telephone = normalizePhone(rawPhone);

      let error = null;
      if (!rawDpi) error = "Missing DPI column";
      else if (!isValid13(id)) error = "DPI must be 13 digits";
      else if (!patient_name) error = "Missing patient name";

      return {
        id,
        patient_name,
        gender,
        age_group,
        telephone,
        originalRow: row,
        error,
        key: `${id}_${idx}`,
      };
    });

  const kpReset = () => {
    setKpRows([]);
    setKpProgress({ current: 0, total: 0 });
    setKpParseError(null);
  };

  const kpHandleFile = async (file) => {
    kpReset();
    const name = (file?.name || "").toLowerCase();
    const isCsv = name.endsWith(".csv");
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls");
    if (!isCsv && !isXlsx) {
      setKpParseError("Please select a .csv, .xlsx, or .xls file.");
      return Upload.LIST_IGNORE;
    }
    try {
      let rows = [];
      if (isCsv) {
        rows = await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => resolve(res.data || []),
            error: reject,
          });
        });
      } else {
        rows = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const wb = XLSX.read(e.target.result, { type: "binary" });
              const firstSheet = wb.SheetNames[0];
              const sheet = wb.Sheets[firstSheet];
              const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
              resolve(json);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsBinaryString(file);
        });
      }
      const normalized = kpNormalizeRows(rows);
      setKpRows(normalized);
    } catch (err) {
      console.error(err);
      setKpParseError(err?.message || "Failed to parse file.");
    }
    return Upload.LIST_IGNORE;
  };

  const kpColumns = [
    {
      title: "DPI",
      dataIndex: "id",
      key: "id",
      render: (v) =>
        v ? `${v.slice(0, 4)} ${v.slice(4, 9)} ${v.slice(9, 13)}` : "",
    },
    { title: "Name", dataIndex: "patient_name", key: "name" },
    { title: "Gender", dataIndex: "gender", key: "gender" },
    { title: "Age Group", dataIndex: "age_group", key: "age_group" },
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

  const kpUploadToFirestore = async () => {
    const validRows = kpRows.filter((r) => !r.error);
    if (!validRows.length) {
      message.error("No valid rows to upload.");
      return;
    }

    setKpLoading(true);
    setKpProgress({ current: 0, total: validRows.length });

    try {
      // Chunk into batches of ~450 to stay under Firestore limits
      const chunks = [];
      for (let i = 0; i < validRows.length; i += 450) {
        chunks.push(validRows.slice(i, i + 450));
      }

      let processed = 0;
      for (const part of chunks) {
        const batch = writeBatch(firestore);
        const now = Timestamp.now();
        part.forEach((row) => {
          const ref = doc(firestore, "known_patients", row.id);
          // Overwrite entire doc (no merge) and include telephone_number
          batch.set(
            ref,
            {
              national_id_number: row.id,
              patient_name: row.patient_name,
              gender: row.gender ?? null,
              age_group: row.age_group ?? null,
              telephone_number: row.telephone ?? null,
              is_new: false,
              updated_at: now,
            },
            { merge: false }, // FULL REPLACE per document
          );
        });
        await batch.commit();
        processed += part.length;
        setKpProgress({ current: processed, total: validRows.length });
      }

      message.success(
        `Uploaded ${validRows.length} records to known_patients.`,
      );
    } catch (err) {
      console.error("Batch upload failed:", err);
      message.error("Batch upload failed.");
    } finally {
      setKpLoading(false);
    }
  };

  useHideMenu(false);

  // -------------------------
  // Render
  // -------------------------
  return (
    <ErrorBoundary>
      <div style={{ padding: 16, paddingBottom: 64 }}>
        {/* MAX WAIT TIMES */}
        <Title level={3}>{t("MAX_WAIT_TIMES") || "Max Wait Times"}</Title>
        <Paragraph>
          {t("ENTER_WAITING_TIMES") ||
            "Enter target max waiting times by station."}
        </Paragraph>

        <Row gutter={[16, 16]}>
          {stations.map((station) => (
            <Col key={station.id} xs={24} md={12} lg={8}>
              <div
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  padding: 16,
                  background: "#fff",
                }}
              >
                <Title level={4} style={{ marginBottom: 12 }}>
                  {station.name}
                </Title>
                <Space align="baseline">
                  <InputNumber
                    min={0}
                    step={30}
                    value={station.max_waiting_time}
                    onChange={(value) => handleMaxTimeUpdate(station.id, value)}
                    style={{ width: 140 }}
                  />
                  <Text>
                    {(Number(station.max_waiting_time || 0) / 60).toFixed(1)}{" "}
                    {t("min") || "min"}
                  </Text>
                </Space>
              </div>
            </Col>
          ))}
        </Row>

        <Divider />

        {/* LOCATIONS */}
        <Title level={3}>{t("LOCATIONS") || "Locations"}</Title>
        <Paragraph>
          {t("MANAGE_LOCATIONS") ||
            "Manage location names, colors, stations, and GPS coordinates."}
        </Paragraph>

        <Row gutter={[16, 16]}>
          {locations.map((location) => (
            <Col key={location.id} xs={24} md={12} lg={8}>
              <div
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  padding: 16,
                  background: "#fff",
                }}
              >
                <Space
                  direction="vertical"
                  style={{ width: "100%" }}
                  size="middle"
                >
                  <div>
                    <Text strong>{t("NAME") || "Name"}</Text>
                    <Input
                      style={{ marginTop: 6 }}
                      value={location.name}
                      onChange={(e) =>
                        handleLocationUpdate(
                          location.id,
                          "name",
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div>
                    <Text strong>
                      {t("BACKGROUND_COLOR") || "Background Color"}
                    </Text>
                    <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                      <HexColorPicker
                        color={location.background_color}
                        onChange={(color) =>
                          handleLocationUpdate(
                            location.id,
                            "background_color",
                            color,
                          )
                        }
                      />
                      <Input
                        value={location.background_color}
                        onChange={(e) =>
                          handleLocationUpdate(
                            location.id,
                            "background_color",
                            e.target.value,
                          )
                        }
                        style={{ width: 140 }}
                      />
                    </div>
                  </div>

                  <div>
                    <Text strong>{t("COORDINATES") || "Coordinates"}</Text>
                    <div style={{ marginTop: 6 }}>
                      <Suspense
                        fallback={<Text>Loading Location Picker...</Text>}
                      >
                        <LocationPicker
                          latitude={location.latitude}
                          longitude={location.longitude}
                          onChange={({ lat, lng }) => {
                            handleLocationUpdate(location.id, "latitude", lat);
                            handleLocationUpdate(location.id, "longitude", lng);
                          }}
                        />
                      </Suspense>
                    </div>
                  </div>

                  <div>
                    <Text strong>{t("STATIONS") || "Stations"}</Text>
                    <Select
                      mode="multiple"
                      value={location.stations}
                      onChange={(stationsArr) =>
                        handleLocationUpdate(
                          location.id,
                          "stations",
                          stationsArr,
                        )
                      }
                      style={{ width: "100%", marginTop: 8 }}
                      placeholder={t("ADD_STATIONS") || "Add stations"}
                      options={stations.map((s) => ({
                        label: s.name,
                        value: s.id,
                      }))}
                    />
                  </div>
                </Space>
              </div>
            </Col>
          ))}
        </Row>

        <Button
          type="dashed"
          onClick={handleAddLocation}
          style={{ marginTop: 16 }}
        >
          {t("ADD_LOCATION") || "Add Location"}
        </Button>

        <Divider />

        {/* USER PERMISSIONS */}
        <Title level={3}>{t("USER_PERMISSIONS") || "User Permissions"}</Title>

        <Table
          size="middle"
          rowKey="id"
          dataSource={users}
          pagination={{ pageSize: 8 }}
          columns={[
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
                const checked =
                  typeof record.permissions === "object" &&
                  record.permissions !== null
                    ? !!record.permissions[key]
                    : false;
                return (
                  <Switch
                    checked={checked}
                    onChange={(val) =>
                      handlePermissionChange(record.id, key, val)
                    }
                  />
                );
              },
            })),
          ]}
          scroll={{ x: 800 }}
        />
        <Paragraph type="secondary">
          {t("MANAGER_DESCRIPTION") ||
            "Manager settings for stations, locations, users, and known patients."}
        </Paragraph>
        <Divider />

        {/* SEND INVITE */}
        <Title level={3}>{t("SEND_INVITE_EMAIL") || "Send Invite"}</Title>

        <Form layout="inline" form={form} onFinish={sendEmail}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input placeholder="user@example.com" style={{ width: 320 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t("SEND") || "Send"}
            </Button>
          </Form.Item>
        </Form>
        <br />
        <br />
        <Divider />
        <br />
        <br />

        {/* =============================== */}
        {/* Upload Known Patients (UPDATED) */}
        {/* =============================== */}
        <Title level={3}>Upload Known Patients</Title>
        <Paragraph>
          Upload a CSV or Excel with <b>DPI</b> (13 digits), <b>Nombre</b>,{" "}
          <b>Género</b>, <b>Edad</b>, and (optionally) <b>telephono</b>. DPI is
          case-insensitive (e.g., “DPI” or “dpi”).
        </Paragraph>

        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="This import overwrites existing known_patients documents (full replace)."
        />

        {kpParseError && (
          <Alert
            type="error"
            showIcon
            message={kpParseError}
            style={{ marginBottom: 12 }}
          />
        )}

        <Dragger
          multiple={false}
          maxCount={1}
          accept=".csv,.xlsx,.xls"
          beforeUpload={kpHandleFile}
          showUploadList={false}
          style={{ background: "#fff" }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {t("CLICKORDRAGFILE")}
            <p>
              File must include DPI (13 digits), Nombre, Género, Edad. Optional:
              telephono/telefono/teléfono/phone.
            </p>
          </p>
        </Dragger>

        {kpRows.length > 0 && (
          <>
            <Alert
              type={kpRows.some((r) => r.error) ? "warning" : "success"}
              showIcon
              message={
                kpRows.some((r) => r.error)
                  ? `${kpRows.length} rows parsed • ${
                      kpRows.filter((r) => !r.error).length
                    } valid • ${kpRows.filter((r) => r.error).length} with issues`
                  : `${kpRows.length} rows parsed • All valid`
              }
              style={{ marginTop: 16 }}
            />

            <Table
              rowKey="key"
              style={{ marginTop: 16 }}
              dataSource={kpRows}
              columns={kpColumns}
              size="small"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 900 }}
            />

            <Space style={{ marginTop: 12 }}>
              <Button
                type="primary"
                onClick={kpUploadToFirestore}
                disabled={!kpRows.some((r) => !r.error) || kpLoading}
                loading={kpLoading}
              >
                Upload to Firestore
              </Button>
              <Button onClick={kpReset} disabled={kpLoading}>
                Reset
              </Button>
            </Space>

            {kpLoading && (
              <div style={{ marginTop: 12, maxWidth: 360 }}>
                <Progress
                  percent={
                    kpProgress.total
                      ? Math.round(
                          (kpProgress.current / kpProgress.total) * 100,
                        )
                      : 0
                  }
                  status="active"
                />
                <Text type="secondary">
                  {kpProgress.current}/{kpProgress.total}
                </Text>
              </div>
            )}
          </>
        )}

        <Divider />
      </div>
    </ErrorBoundary>
  );
};

export default Settings;
