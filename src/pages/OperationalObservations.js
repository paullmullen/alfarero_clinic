// src/pages/OperationalObservations.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Form,
  Select,
  Input,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  message,
  Segmented,
} from "antd";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { firestore, auth } from "../helpers/firebaseConfig";

const { Title, Text } = Typography;
const { TextArea } = Input;

const Page = styled.div`
  padding: 16px;

  /* Space between category pills */
  .opsCategorySegmented .ant-segmented-group {
    gap: 10px;
  }

  .opsCategorySegmented .ant-segmented-item {
    border-radius: 10px;
    padding: 4px 14px;
  }

  /* Selected category highlight */
  .opsCategorySegmented .ant-segmented-item-selected {
    background-color: #2b2f87; /* your app’s blue */
    color: white;
    font-weight: 600;
  }

  /* Hover state (optional but feels nice) */
  .opsCategorySegmented .ant-segmented-item:hover {
    background-color: #e8ebff;
  }
`;

const CATEGORIES = [
  { value: "internal", labelKey: "ops.categories.internal" },
  { value: "external", labelKey: "ops.categories.external" },
  { value: "facility", labelKey: "ops.categories.facility" },
];

// local YYYY-MM-DD (Guatemala). If you have a shared helper, swap it in.
function getLocalYMD(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function subtractDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

// Convert whatever the API gives us into a Firestore Timestamp
function toTimestamp(v) {
  if (!v) return null;

  // already a Timestamp
  if (typeof v?.toDate === "function") return v;

  // ISO date string
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return Timestamp.fromDate(d);
    return null;
  }

  // { seconds, nanoseconds }
  if (typeof v === "object" && typeof v.seconds === "number") {
    return new Timestamp(v.seconds, v.nanoseconds || 0);
  }

  // { _seconds, _nanoseconds } (common JSON shape)
  if (typeof v === "object" && typeof v._seconds === "number") {
    return new Timestamp(v._seconds, v._nanoseconds || 0);
  }

  // millis
  if (typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return Timestamp.fromDate(d);
  }

  return null;
}

export default function OperationalObservations() {
  const [t] = useTranslation("global");
  const [form] = Form.useForm();

  const [user, setUser] = useState(null);

  const [category, setCategory] = useState("internal");
  const [types, setTypes] = useState([]); // { id, category, labelKey, sortOrder, active }
  const [services, setServices] = useState([]); // { value: station_type, label: string }
  const [loading, setLoading] = useState(false);

  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // Auth user (for createdBy)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const categoryOptions = useMemo(() => {
    return CATEGORIES.map((c) => ({ value: c.value, label: t(c.labelKey) }));
  }, [t]);

  const filteredTypes = useMemo(() => {
    return types
      .filter((x) => x.category === category)
      .filter((x) => x.active !== false)
      .sort(
        (a, b) =>
          (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) ||
          String(a.id).localeCompare(String(b.id)),
      );
  }, [types, category]);

  const typeOptions = useMemo(() => {
    return filteredTypes.map((x) => ({
      value: x.id,
      label: t(x.labelKey) || x.id,
    }));
  }, [filteredTypes, t]);

  const servicesOptions = useMemo(() => {
    return services.map((s) => ({ value: s.value, label: t(s.label) }));
  }, [services, t]);

  async function loadServicesFromStats() {
    const snap = await getDocs(collection(firestore, "stats"));
    const rows = snap.docs
      .map((d) => d.data() || {})
      .map((data) => {
        const stationType = data.station_type;
        if (!stationType) return null;
        return {
          value: stationType,
          // ✅ ops-prefixed station translations
          label: t(`ops.stations.${stationType}`) || stationType,
        };
      })
      .filter(Boolean);

    // de-dupe by station_type
    const map = new Map();
    for (const r of rows) map.set(r.value, r);

    const unique = Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );

    setServices(unique);
  }

  // NEW: Load BOTH types + observations from the Cloud Function feed
  async function loadObservationsFeed() {
    setRecentLoading(true);

    try {
      const startYMD = getLocalYMD(subtractDays(new Date(), 30));
      const endYMD = getLocalYMD(new Date());

      const url = new URL(
        "https://us-central1-alfarero-478ad.cloudfunctions.net/getOpsObservationsFeed",
      );
      url.searchParams.set("startYMD", startYMD);
      url.searchParams.set("endYMD", endYMD);

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        throw new Error(`getOpsObservationsFeed HTTP ${res.status}`);
      }

      const data = await res.json();

      // typesById → array (keep same shape as before)
      const typesArray = Object.entries(data?.typesById || {}).map(
        ([id, v]) => {
          const obj = v || {};
          return {
            id,
            category: obj.category ?? "",
            labelKey: obj.labelKey ?? `ops.types.${id}`,
            sortOrder: obj.sortOrder ?? null,
            active: obj.active ?? true,
          };
        },
      );
      console.log("typesArray from feed:", typesArray);
      console.log("categories returned:", [
        ...new Set(typesArray.map((x) => x.category)),
      ]);
      console.log("current selected category:", category);
      setTypes(typesArray);

      // observations (normalize timestamps so the table render/sorter works)
      const obs = Array.isArray(data?.observations) ? data.observations : [];
      const normalized = obs.map((o) => {
        const rec = o || {};
        return {
          ...rec,
          date: toTimestamp(rec.date) || rec.date,
          createdAt: toTimestamp(rec.createdAt) || rec.createdAt,
        };
      });

      setRecent(normalized);
    } catch (err) {
      console.error(err);
      message.error(t("ops.loadError") || "Error loading observations");
    } finally {
      setRecentLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadObservationsFeed(), loadServicesFromStats()]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If category changes, clear selected type (prevents mismatch)
  useEffect(() => {
    form.setFieldsValue({ typeId: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const columns = useMemo(() => {
    return [
      {
        title: t("ops.table.date") || "Date",
        dataIndex: "date",
        key: "date",
        width: 170,
        render: (ts) => {
          try {
            const d = ts?.toDate ? ts.toDate() : null;
            if (!d) return "";
            return d.toLocaleString();
          } catch {
            return "";
          }
        },
        sorter: (a, b) => {
          const ad = a?.date?.toMillis ? a.date.toMillis() : 0;
          const bd = b?.date?.toMillis ? b.date.toMillis() : 0;
          return ad - bd;
        },
        defaultSortOrder: "descend",
      },
      {
        title: t("ops.table.category") || "Category",
        dataIndex: "category",
        key: "category",
        width: 140,
        render: (c) => t(`ops.categories.${c}`) || c,
        filters: CATEGORIES.map((c) => ({
          text: t(c.labelKey),
          value: c.value,
        })),
        onFilter: (value, record) => record.category === value,
      },
      {
        title: t("ops.table.type") || "Type",
        dataIndex: "typeLabelKey",
        key: "typeLabelKey",
        width: 240,
        render: (_, record) => t(record.typeLabelKey) || record.typeId || "",
      },
      {
        title: t("ops.table.services") || "Services",
        dataIndex: "servicesAffected",
        key: "servicesAffected",
        render: (arr) => {
          const list = Array.isArray(arr) ? arr : [];
          if (!list.length) return <Text type="secondary">—</Text>;

          return (
            <Space size={[4, 6]} wrap>
              {list.map((s) => (
                // ✅ ops-prefixed station translations
                <Tag key={s}>{t(`ops.stations.${s}`) || s}</Tag>
              ))}
            </Space>
          );
        },
      },
      {
        title: t("ops.table.notes") || "Notes",
        dataIndex: "notes",
        key: "notes",
        render: (v) => v || <Text type="secondary">—</Text>,
      },
      {
        title: t("ops.table.createdBy") || "By",
        dataIndex: "createdBy",
        key: "createdBy",
        width: 160,
        render: (v) => v || <Text type="secondary">—</Text>,
      },
    ];
  }, [t]);

  const onAdd = async (values) => {
    const type = types.find((x) => x.id === values.typeId);
    if (!type) {
      message.error(t("ops.typeRequired") || "Type is required");
      return;
    }

    const createdBy = user?.displayName || user?.email || "Unknown";

    const payload = {
      date: Timestamp.now(),
      ymd: getLocalYMD(new Date()),
      category: type.category || category,
      typeId: type.id,
      typeLabelKey: type.labelKey,
      servicesAffected: Array.isArray(values.servicesAffected)
        ? values.servicesAffected
        : [],
      notes: String(values.notes || "").trim(),
      createdBy,
      createdAt: serverTimestamp(),
    };

    setLoading(true);
    try {
      await addDoc(collection(firestore, "ops_observations"), payload);
      message.success(t("ops.added") || "Added");

      // Clear notes; keep selections for fast repeated entry
      form.setFieldsValue({ notes: "" });

      // IMPORTANT: reload via the same cloud function feed
      await loadObservationsFeed();
    } catch (err) {
      console.error(err);
      message.error(t("ops.addError") || "Error adding observation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Title level={2} style={{ marginTop: 0 }}>
        {t("ops.title") || "Operational Observations"}
      </Title>

      <Card style={{ marginBottom: 16 }} loading={loading}>
        <Title level={4} style={{ marginTop: 0 }}>
          {t("ops.newObservation") || "New Observation"}
        </Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={onAdd}
          initialValues={{
            servicesAffected: [],
            notes: "",
          }}
        >
          {/* ✅ Category: vertical (label above, control below) */}
          <Form.Item
            label={t("ops.category") || "Categoría"}
            style={{ marginBottom: 18 }}
          >
            <Segmented
              value={category}
              onChange={(v) => setCategory(v)}
              options={categoryOptions}
              block
              className="opsCategorySegmented"
            />
          </Form.Item>

          {/* ✅ Type: pull-down */}
          <Form.Item
            label={t("ops.type") || "Clase de Observación"}
            name="typeId"
            rules={[
              { required: true, message: t("ops.typeRequired") || "Required" },
            ]}
          >
            <Select
              showSearch
              placeholder={t("ops.typePlaceholder") || "Select a type"}
              options={typeOptions}
              filterOption={(input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            label={t("ops.servicesAffected") || "Services affected"}
            name="servicesAffected"
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={t("ops.servicesPlaceholder") || "Select services"}
              options={servicesOptions}
            />
          </Form.Item>

          <Form.Item label={t("ops.notes") || "Notes"} name="notes">
            <TextArea
              placeholder={t("ops.notesPlaceholder") || "Add notes (optional)"}
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </Form.Item>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text type="secondary">
              {t("ops.dateAssumedToday") || "Date assumed to be today."}{" "}
              <b>{getLocalYMD(new Date())}</b>
              {"  "}•{"  "}
              {t("ops.recordingAs") || "Recording as"}:{" "}
              <b>{user?.displayName || user?.email || "…"}</b>
            </Text>

            <Button type="primary" htmlType="submit" loading={loading}>
              {t("ops.add") || "Add"}
            </Button>
          </div>
        </Form>
      </Card>

      <Card
        title={t("ops.recentObservations") || "Last 30 days"}
        extra={
          <Button onClick={loadObservationsFeed} loading={recentLoading}>
            {t("ops.refresh") || "Refresh"}
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={recent}
          loading={recentLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </Page>
  );
}
