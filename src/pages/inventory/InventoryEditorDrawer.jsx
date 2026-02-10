import React, { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  Popconfirm,
  message,
} from "antd";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "../../helpers/firebaseConfig";

function safeT(t, key, fallback) {
  const v = t ? t(key) : "";
  return v && v !== key ? v : fallback;
}

export default function InventoryEditorDrawer({
  open,
  onClose,
  locationId,
  locationName,
  userLabel,
  t,
}) {
  const [items, setItems] = useState([]);
  const [countsByItemId, setCountsByItemId] = useState(new Map());

  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    units: "",
  });

  // --- Live catalog items ---
  useEffect(() => {
    if (!open) return;

    setLoadingItems(true);

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
        setLoadingItems(false);
      },
      (err) => {
        console.error("InventoryEditorDrawer items load error:", err);
        setLoadingItems(false);
        message.error(
          safeT(t, "inventory.editorLoadFailed", "Failed to load items."),
        );
      },
    );

    return () => unsub();
  }, [open, t]);

  // --- Live location counts (par/current live under locations/{locationId}/inventory_counts/{itemId}) ---
  useEffect(() => {
    if (!open) return;

    if (!locationId) {
      setCountsByItemId(new Map());
      setLoadingCounts(false);
      return;
    }

    setLoadingCounts(true);

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
        snap.docs.forEach((d) => {
          // doc id == itemId
          m.set(d.id, d.data());
        });
        setCountsByItemId(m);
        setLoadingCounts(false);
      },
      (err) => {
        console.error("InventoryEditorDrawer counts load error:", err);
        setLoadingCounts(false);
        message.error(
          safeT(
            t,
            "inventory.editorCountsLoadFailed",
            "Failed to load counts.",
          ),
        );
      },
    );

    return () => unsub();
  }, [open, locationId, t]);

  const loading = loadingItems || loadingCounts;

  // --- Catalog updates ---
  const updateItemField = async (itemId, patch) => {
    await updateDoc(doc(firestore, "inventory_items", itemId), {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedBy: userLabel ?? "unknown",
    });
  };

  const removeItem = async (itemId) => {
    await updateItemField(itemId, { isActive: false });
  };

  // --- Location par updates ---
  const updateLocationPar = async (itemId, par) => {
    if (!locationId) {
      message.error(safeT(t, "inventory.noLocation", "No location selected."));
      return;
    }

    await setDoc(
      doc(firestore, "locations", locationId, "inventory_counts", itemId),
      {
        par,
        updatedAt: serverTimestamp(),
        updatedBy: userLabel ?? "unknown",
      },
      { merge: true },
    );
  };

  const addItem = async () => {
    const name = newItem.name.trim();
    const category = newItem.category.trim();
    const units = newItem.units.trim();

    if (!name || !category) {
      message.error(
        safeT(
          t,
          "inventory.editorNameCategoryRequired",
          "Name and category are required.",
        ),
      );
      return;
    }

    await addDoc(collection(firestore, "inventory_items"), {
      name,
      category,
      units,
      isActive: true,
      createdAt: serverTimestamp(),
      createdBy: userLabel ?? "unknown",
      updatedAt: serverTimestamp(),
      updatedBy: userLabel ?? "unknown",
    });

    setNewItem({ name: "", category: "", units: "" });
    message.success(safeT(t, "inventory.editorAdded", "Item added."));
  };

  const columns = useMemo(() => {
    return [
      {
        title: safeT(t, "inventory.editor.name", "Name"),
        dataIndex: "name",
        key: "name",
        render: (val, row) => (
          <Input
            defaultValue={val}
            onBlur={(e) =>
              updateItemField(row.id, { name: e.target.value }).catch((err) => {
                console.error("update name error:", err);
                message.error(
                  safeT(t, "inventory.editorUpdateFailed", "Update failed."),
                );
              })
            }
          />
        ),
      },
      {
        title: safeT(t, "inventory.editor.category", "Category"),
        dataIndex: "category",
        key: "category",
        render: (val, row) => (
          <Input
            defaultValue={val}
            onBlur={(e) =>
              updateItemField(row.id, { category: e.target.value }).catch(
                (err) => {
                  console.error("update category error:", err);
                  message.error(
                    safeT(t, "inventory.editorUpdateFailed", "Update failed."),
                  );
                },
              )
            }
          />
        ),
      },
      {
        title: safeT(t, "inventory.editor.units", "Units"),
        dataIndex: "units",
        key: "units",
        width: 170,
        render: (val, row) => (
          <Input
            defaultValue={val}
            onBlur={(e) =>
              updateItemField(row.id, { units: e.target.value }).catch(
                (err) => {
                  console.error("update units error:", err);
                  message.error(
                    safeT(t, "inventory.editorUpdateFailed", "Update failed."),
                  );
                },
              )
            }
          />
        ),
      },
      {
        title: safeT(t, "inventory.editor.par", "Par"),
        key: "par",
        width: 140,
        render: (_, row) => {
          const par = Number(countsByItemId.get(row.id)?.par ?? 0);

          return (
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              value={par}
              disabled={!locationId}
              onChange={(v) => {
                // live UI change without waiting for blur/snapshot
                const next = Number(v ?? 0);
                setCountsByItemId((prev) => {
                  const m = new Map(prev);
                  const cur = m.get(row.id) ?? {};
                  m.set(row.id, { ...cur, par: next });
                  return m;
                });
              }}
              onBlur={(e) => {
                const v = Number(e?.target?.value);
                const next = Number.isFinite(v) ? v : 0;

                updateLocationPar(row.id, next).catch((err) => {
                  console.error("update par error:", err);
                  message.error(
                    safeT(t, "inventory.editorUpdateFailed", "Update failed."),
                  );
                });
              }}
            />
          );
        },
      },
      {
        title: safeT(t, "inventory.editor.remove", "Remove"),
        key: "remove",
        width: 120,
        render: (_, row) => (
          <Popconfirm
            title={safeT(
              t,
              "inventory.editor.confirmRemove",
              "Remove this item?",
            )}
            okText={safeT(t, "common.remove", "Remove")}
            cancelText={safeT(t, "common.cancel", "Cancel")}
            onConfirm={() =>
              removeItem(row.id).catch((err) => {
                console.error("remove item error:", err);
                message.error(
                  safeT(t, "inventory.editorRemoveFailed", "Remove failed."),
                );
              })
            }
          >
            <Button danger>{safeT(t, "common.remove", "Remove")}</Button>
          </Popconfirm>
        ),
      },
    ];
  }, [t, countsByItemId, locationId]);

  return (
    <Drawer
      title={`${safeT(t, "inventory.editor.title", "Edit inventory items & pars")}${
        locationName ? ` — ${locationName}` : ""
      }`}
      width={980}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Space wrap>
          <Input
            placeholder={safeT(t, "inventory.editor.newName", "Name")}
            value={newItem.name}
            onChange={(e) =>
              setNewItem((p) => ({ ...p, name: e.target.value }))
            }
            style={{ width: 240 }}
          />
          <Input
            placeholder={safeT(t, "inventory.editor.newCategory", "Category")}
            value={newItem.category}
            onChange={(e) =>
              setNewItem((p) => ({ ...p, category: e.target.value }))
            }
            style={{ width: 240 }}
          />
          <Input
            placeholder={safeT(t, "inventory.editor.newUnits", "Units")}
            value={newItem.units}
            onChange={(e) =>
              setNewItem((p) => ({ ...p, units: e.target.value }))
            }
            style={{ width: 200 }}
          />

          <Button
            type="primary"
            onClick={() =>
              addItem().catch((err) => {
                console.error("addItem error:", err);
                message.error(
                  safeT(t, "inventory.editorAddFailed", "Failed to add item."),
                );
              })
            }
          >
            {safeT(t, "common.add", "Add")}
          </Button>

          {!locationId && (
            <span style={{ marginLeft: 8, opacity: 0.7 }}>
              {safeT(t, "inventory.noLocation", "No location selected.")}
            </span>
          )}
        </Space>

        <Table
          rowKey="id"
          dataSource={items}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 12 }}
          scroll={{ x: 950 }}
        />
      </Space>
    </Drawer>
  );
}
