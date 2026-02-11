import React from "react";
import { Typography, Form, Input, Button, message } from "antd";
import { useTranslation } from "react-i18next";
import { getFunctions, httpsCallable } from "firebase/functions";

const { Title } = Typography;

export default function InviteEmailForm() {
  const [t] = useTranslation("global");
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const sendEmail = async (values) => {
    setLoading(true);
    try {
      const functions = getFunctions(); // uses default Firebase app
      const sendInviteEmail = httpsCallable(functions, "sendInviteEmail");

      const res = await sendInviteEmail({ email: values.email });

      if (res?.data?.ok) {
        message.success(t("EMAIL_SENT_SUCCESS") || "Email sent");
        form.resetFields();
      } else {
        message.error(t("EMAIL_SEND_ERROR") || "Error sending email");
      }
    } catch (err) {
      const msg =
        err?.message || t("EMAIL_SEND_ERROR") || "Error sending email";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
    </>
  );
}
