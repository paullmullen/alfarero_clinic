/* eslint-disable */
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Popconfirm,
  message,
  Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../../../helpers/firebaseConfig";

const { Title } = Typography;

const OrganizationsManager = ({ t }) => {
  const [organizations, setOrganizations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const q = query(
      collection(firestore, "organizations"),
      orderBy("order", "asc"),
      orderBy("name", "asc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrganizations(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      );
    });

    return () => unsubscribe();
  }, []);

  const openAdd = () => {
    setEditingOrg(null);
    form.setFieldsValue({
      name: "",
      order: organizations.length + 1,
      active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (org) => {
    setEditingOrg(org);
    form.setFieldsValue({
      name: org.name || "",
      order: org.order ?? 0,
      active: org.active !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingOrg(null);
    form.resetFields();
  };

  const handleSave = async () => {
    let values;

    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: values.name.trim(),
        order: values.order ?? 0,
        active: values.active !== false,
        updated_at: serverTimestamp(),
      };

      if (editingOrg?.id) {
        await updateDoc(
          doc(firestore, "organizations", editingOrg.id),
          payload,
        );
        message.success(t("organizationUpdated"));
      } else {
        await addDoc(collection(firestore, "organizations"), {
          ...payload,
          created_at: serverTimestamp(),
        });
        message.success(t("organizationCreated"));
      }

      closeModal();
    } catch (error) {
      console.error("Error saving organization", error);
      message.error(t("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org) => {
    try {
      await deleteDoc(doc(firestore, "organizations", org.id));
      message.success(t("organizationDeleted"));
    } catch (error) {
      console.error("Error deleting organization", error);
      message.error(t("somethingWentWrong"));
    }
  };

  const columns = [
    {
      title: t("organizationName"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("organizationOrder"),
      dataIndex: "order",
      key: "order",
      width: 100,
      sorter: (a, b) => (a.order ?? 0) - (b.order ?? 0),
    },
    {
      title: t("organizationActive"),
      dataIndex: "active",
      key: "active",
      width: 120,
      render: (active) => (active !== false ? t("YES") : t("NO")),
    },
    {
      title: t("action"),
      key: "action",
      width: 160,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />

          <Popconfirm
            title={t("areYouSure")}
            onConfirm={() => handleDelete(record)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space
        align="center"
        style={{ width: "100%", justifyContent: "space-between" }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {t("organizations")}
        </Title>

        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          {t("addOrganization")}
        </Button>
      </Space>

      <Table
        style={{ marginTop: 16 }}
        rowKey="id"
        columns={columns}
        dataSource={organizations}
        pagination={false}
      />

      <Modal
        open={modalOpen}
        title={editingOrg ? t("editOrganization") : t("addOrganization")}
        onCancel={closeModal}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t("SAVE")}
        cancelText={t("common.cancel")}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t("organizationName")}
            name="name"
            rules={[{ required: true, message: t("organizationName") }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label={t("organizationOrder")} name="order">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label={t("organizationActive")}
            name="active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrganizationsManager;
