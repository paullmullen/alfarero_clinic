import React, { useEffect, useState } from "react";
import { Alert, Button, Form, Input, List, Popconfirm, Typography, message } from "antd";
import { useTranslation } from "react-i18next";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { firestore } from "../../../helpers/firebaseConfig";

export default function ObserversManager() {
  const [t] = useTranslation("global");
  const [form] = Form.useForm();
  const [observers, setObservers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    const observersQuery = query(collection(firestore, "report_observers"), orderBy("email"));
    return onSnapshot(observersQuery, (snapshot) => {
      setObservers(snapshot.docs.map((entry) => entry.data().email));
      setLoading(false);
    }, () => {
      setObservers([]);
      setLoadError(true);
      setLoading(false);
    });
  }, []);

  async function addObserver({ email }) {
    setSaving(true);
    const address = email.trim().toLowerCase();
    try {
      await setDoc(doc(firestore, "report_observers", address), { email: address });
      form.resetFields();
    } catch {
      message.error(t("OBSERVERS_SAVE_ERROR"));
    } finally {
      setSaving(false);
    }
  }

  async function removeObserver(email) {
    setRemoving(email);
    try {
      await deleteDoc(doc(firestore, "report_observers", email));
    } catch {
      message.error(t("OBSERVERS_SAVE_ERROR"));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section aria-labelledby="observers-title">
      <Typography.Title id="observers-title" level={3}>{t("OBSERVERS_TITLE")}</Typography.Title>
      <Typography.Paragraph type="secondary">{t("OBSERVERS_DESCRIPTION")}</Typography.Paragraph>
      {loadError ? (
        <Alert type="error" showIcon message={t("OBSERVERS_LOAD_ERROR")} />
      ) : (
        <>
          <Form form={form} layout="inline" onFinish={addObserver}>
            <Form.Item
              name="email"
              label={t("OBSERVERS_EMAIL")}
              rules={[{
                required: true,
                pattern: /^[a-z0-9.!#$%&'*+=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i,
                max: 254,
                transform: (value) => value?.trim(),
                message: t("OBSERVERS_INVALID_EMAIL"),
              }]}
            >
              <Input type="email" autoComplete="email" placeholder="nombre@example.com" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving} disabled={loading}>
                {t("OBSERVERS_ADD")}
              </Button>
            </Form.Item>
          </Form>
          <List
            size="small"
            loading={loading}
            locale={{ emptyText: t("OBSERVERS_EMPTY") }}
            dataSource={observers}
            renderItem={(email) => (
              <List.Item actions={[
                <Popconfirm key="remove" title={t("OBSERVERS_CONFIRM_REMOVE", { email })} onConfirm={() => removeObserver(email)}>
                  <Button danger type="link" loading={removing === email} disabled={removing !== null}>
                    {t("OBSERVERS_REMOVE")}
                  </Button>
                </Popconfirm>,
              ]}>
                {email}
              </List.Item>
            )}
          />
        </>
      )}
    </section>
  );
}
