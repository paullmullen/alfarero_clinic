import React from "react";
import { Typography, Form, Input, Button, message } from "antd";
import { firestore } from "../../../helpers/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import axios from "axios";

const { Title } = Typography;

export default function InviteEmailForm({ t }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const sendEmail = async (values) => {
    setLoading(true);
    try {
      const ref = doc(firestore, "signupMessage", "email_message");
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        message.error(
          t("EMAIL_MESSAGE_NOT_FOUND") || "Email message template not found"
        );
        return;
      }

      const { text, subjectLine } = snap.data();
      const res = await axios.post(
        "https://sendemail-479287307088.us-central1.run.app",
        { to: values.email, subject: subjectLine, html: text },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.status === 200) {
        message.success(t("EMAIL_SENT_SUCCESS") || "Email sent");
        form.resetFields();
      } else {
        message.error(t("EMAIL_SEND_ERROR") || "Error sending email");
      }
    } catch (err) {
      message.error(
        `${t("EMAIL_SEND_ERROR") || "Error sending email"}: ${err.message}`
      );
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