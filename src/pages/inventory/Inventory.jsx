import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Suspense,
  lazy,
} from "react";
import styled from "styled-components";
import {
  Alert,
  Button,
  Divider,
  Input,
  InputNumber,
  Space,
  Spin,
  Table,
  Typography,
  message,
} from "antd";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { firestore } from "../../helpers/firebaseConfig";
import { useTranslation } from "react-i18next";
import { useServiceLocation } from "../../providers/ServiceLocationProvider";

const InventoryEditorDrawer = lazy(() => import("./InventoryEditorDrawer"));

const Page = styled.div`
  padding: 20px;
`;

const CategoryTitle = styled.div`
  font-size: 20px;
  font-weight: 600;
  margin: 18px 0 10px;
`;

function safeT(t, key, fallback) {
  const v = t(key);
  return v && v !== key ? v : fallback;
}

// Reads your users doc by auth.uid (field "uid" in users collection)
function useCurrentUserDoc() {
  const auth = getAuth();
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setUserDoc(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const qUsers = query(
      collection(firestore, "users"),
      where("uid", "==", uid),
    );

    const unsub = onSnapshot(
      qUsers,
      (snap) => {
        const doc0 = snap.docs[0];
        setUserDoc(doc0 ? { id: doc0.id, ...doc0.data() } : null);
        setLoading(false);
      },
      (err) => {
        console.error("useCurrentUserDoc error:", err);
        setUserDoc(null);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [auth.currentUser?.uid]);

  return { userDoc, loading };
}

function useInventoryItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const qItems = query(
      collection(firestore, "inventory_items"),
      where("isActive", "==", true),
      orderBy("category"),
      orderBy("name"),
    );

    const unsub = onSnapshot(
      qItems,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("useInventoryItems error:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  return { items, loading };
}

function useLocationCounts(locationId, isAllLocations) {
  const [countsByItemId, setCountsByItemId] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationId || isAllLocations) {
      setCountsByItemId(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);

    const countsCol = collection(
      firestore,
      "locations",
      locationId,
      "inventory_counts",
    );

    const unsub = onSnapshot(
      countsCol,
      (snap) => {
        const m = new Map();
        snap.docs.forEach((d) => m.set(d.id, d.data()));
        setCountsByItemId(m);
        setLoading(false);
      },
      (err) => {
        console.error("useLocationCounts error:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [locationId, isAllLocations]);

  return { countsByItemId, loading };
}

function useLocationNote(locationId, isAllLocations) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationId || isAllLocations) {
      setNote("");
      setLoading(false);
      return;
    }

    setLoading(true);

    const ref = doc(
      firestore,
      "locations",
      locationId,
      "inventory_note",
      "current",
    );

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setNote(snap.exists() ? (snap.data()?.note ?? "") : "");
        setLoading(false);
      },
      (err) => {
        console.error("useLocationNote error:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [locationId, isAllLocations]);

  return { note, setNote, loading };
}

export default function Inventory() {
  const [t] = useTranslation("global");
  const { locationId, isAllLocations, selectedLocation } = useServiceLocation();

  const { userDoc, loading: loadingUser } = useCurrentUserDoc();
  const canEditInventory = !!userDoc?.permissions?.inventory_edit;

  const { items, loading: loadingItems } = useInventoryItems();
  const { countsByItemId, loading: loadingCounts } = useLocationCounts(
    locationId,
    isAllLocations,
  );
  const {
    note,
    setNote,
    loading: loadingNote,
  } = useLocationNote(locationId, isAllLocations);

  const [editorOpen, setEditorOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const loading = loadingUser || loadingItems || loadingCounts || loadingNote;

  const rows = useMemo(() => {
    return items.map((it) => {
      const c = countsByItemId.get(it.id);
      const current = Number(c?.current ?? 0);
      const par = Number(c?.par ?? 0); // <-- per-location par only
      return {
        itemId: it.id,
        name: it.name ?? "",
        category: it.category ?? "",
        units: it.units ?? "",
        shelf: c?.shelf ?? "",
        par,
        current,
      };
    });
  }, [items, countsByItemId]);

  const grouped = useMemo(() => {
    const g = {};
    for (const r of rows) {
      const cat =
        r.category || safeT(t, "inventory.uncategorized", "Uncategorized");
      if (!g[cat]) g[cat] = [];
      g[cat].push(r);
    }
    return g;
  }, [rows, t]);

  const categories = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const updateCurrent = useCallback(
    async (row, value) => {
      if (!locationId || isAllLocations) {
        message.error(
          safeT(
            t,
            "inventory.noSingleLocation",
            "Please select a specific location.",
          ),
        );
        return;
      }

      const v = Number.isFinite(value) ? value : 0;

      const ref = doc(
        firestore,
        "locations",
        locationId,
        "inventory_counts",
        row.itemId,
      );

      await setDoc(
        ref,
        {
          current: v,
          updatedAt: serverTimestamp(),
          updatedBy: userDoc?.name ?? userDoc?.email ?? "unknown",
        },
        { merge: true },
      );
    },
    [locationId, isAllLocations, userDoc, t],
  );

  const saveNote = useCallback(async () => {
    if (!locationId || isAllLocations) return;

    setSavingNote(true);
    try {
      const ref = doc(
        firestore,
        "locations",
        locationId,
        "inventory_note",
        "current",
      );

      await setDoc(
        ref,
        {
          note: note ?? "",
          updatedAt: serverTimestamp(),
          updatedBy: userDoc?.name ?? userDoc?.email ?? "unknown",
        },
        { merge: true },
      );
    } catch (e) {
      console.error("saveNote error:", e);
      message.error(
        safeT(t, "inventory.noteSaveFailed", "Failed to save note."),
      );
    } finally {
      setSavingNote(false);
    }
  }, [locationId, isAllLocations, note, userDoc, t]);

  const sendToManagers = useCallback(async () => {
    if (!locationId || isAllLocations) {
      message.error(safeT(t, "inventory.selectLocationInfo"));
      return;
    }

    try {
      await addDoc(collection(firestore, "inventory_reports"), {
        locationId,
        note: note ?? "",
        createdAt: serverTimestamp(),
        createdBy: userDoc?.name ?? userDoc?.email ?? "unknown",
      });

      message.success(
        safeT(
          t,
          "inventory.reportQueued",
          "Inventory update queued for managers.",
        ),
      );
    } catch (e) {
      console.error("sendToManagers error:", e);
      message.error(
        safeT(t, "inventory.reportFailed", "Failed to queue inventory report."),
      );
    }
  }, [locationId, isAllLocations, note, userDoc, t]);

  const columns = useMemo(
    () => [
      {
        title: safeT(t, "inventory.item", "Item"),
        dataIndex: "name",
        key: "name",
        render: (text, row) => {
          const below = row.current < row.par;
          return (
            <span
              style={{
                fontWeight: below ? 700 : 400,
                color: below ? "red" : "inherit",
              }}
            >
              {text}
            </span>
          );
        },
      },
      {
        title: safeT(t, "inventory.shelf", "Shelf"),
        dataIndex: "shelf",
        key: "shelf",
        width: 160,
        render: (v) => v || "",
      },
      {
        title: safeT(t, "inventory.par", "Par"),
        dataIndex: "par",
        key: "par",
        width: 90,
      },
      {
        title: safeT(t, "inventory.current", "Current"),
        dataIndex: "current",
        key: "current",
        width: 140,
        render: (_, row) => (
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            value={row.current}
            disabled={!locationId || isAllLocations}
            onBlur={(e) => {
              const v = Number(e?.target?.value);
              updateCurrent(row, v).catch((err) => {
                console.error("updateCurrent error:", err);
                message.error(
                  safeT(t, "inventory.updateFailed", "Update failed."),
                );
              });
            }}
          />
        ),
      },
      {
        title: safeT(t, "inventory.units", "Units"),
        dataIndex: "units",
        key: "units",
        width: 140,
      },
    ],
    [t, updateCurrent, locationId, isAllLocations],
  );

  return (
    <Page>
      <Space
        style={{ width: "100%", justifyContent: "space-between" }}
        align="center"
      >
        <Typography.Title level={2} style={{ margin: 0 }}>
          {safeT(t, "inventory.title", "Inventory")}
          {selectedLocation?.name ? ` — ${selectedLocation.name}` : ""}
        </Typography.Title>

        <Space>
          {canEditInventory && (
            <Button
              onClick={() => setEditorOpen(true)}
              disabled={!locationId || isAllLocations}
            >
              {safeT(t, "inventory.editItems", "Edit items & pars")}
            </Button>
          )}
          <Button
            type="primary"
            onClick={sendToManagers}
            disabled={!locationId || isAllLocations}
          >
            {safeT(t, "inventory.sendToManagers", "Send update to managers")}
          </Button>
        </Space>
      </Space>

      <Divider />

      {isAllLocations && (
        <Alert
          type="info"
          showIcon
          message={safeT(t, "inventory.selectLocationInfo")}
          style={{ marginBottom: 16 }}
        />
      )}

      {loading ? (
        <div style={{ padding: 24 }}>
          <Spin />
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat}>
            <CategoryTitle>{cat}</CategoryTitle>
            <Table
              rowKey="itemId"
              dataSource={grouped[cat]}
              columns={columns}
              pagination={false}
              bordered
              size="middle"
            />
            <div style={{ height: 10 }} />
          </div>
        ))
      )}

      <Divider />

      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {safeT(t, "inventory.notesTitle", "Non-usual items / notes")}
      </Typography.Title>

      <Input.TextArea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={saveNote}
        rows={4}
        placeholder={safeT(
          t,
          "inventory.notesPlaceholder",
          "Enter free-text notes for unusual items, shortages, substitutions, etc.",
        )}
        disabled={!locationId || isAllLocations}
      />

      {savingNote && (
        <div style={{ marginTop: 8 }}>
          <Spin size="small" />{" "}
          <span style={{ marginLeft: 8 }}>
            {safeT(t, "inventory.saving", "Saving...")}
          </span>
        </div>
      )}

      {canEditInventory && (
        <Suspense
          fallback={
            <div style={{ padding: 12 }}>
              <Spin />
            </div>
          }
        >
          <InventoryEditorDrawer
            open={editorOpen}
            onClose={() => setEditorOpen(false)}
            locationId={locationId}
            locationName={selectedLocation?.name || ""}
            userLabel={userDoc?.name ?? userDoc?.email ?? "unknown"}
            t={t}
          />
        </Suspense>
      )}
    </Page>
  );
}
