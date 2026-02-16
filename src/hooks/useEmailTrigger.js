// src/hooks/useEmailTrigger.js
import { useState, useCallback } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";

/**
 * useEmailTrigger
 *
 * Handles calling the Cloud Run endpoint that sends your daily email.
 * Returns:
 *   triggerEmail()  - async function to invoke the email
 *   loading         - boolean
 */
export function useEmailTrigger() {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation("global");

  const triggerEmail = useCallback(async () => {
    setLoading(true);
    console.log("sending email");
    try {
      const res = await fetch(
        "https://manualdailyemail-3tomq62xlq-uc.a.run.app",
        {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      message.success(t("EMAIL_SENT_SUCCESS"));
    } catch (err) {
      console.error("Email trigger failed:", err);
      message.error(
        `${t("EMAIL_SEND_ERROR")}: ${err?.message ?? t("UNKNOWN_ERROR")}`,
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  return { triggerEmail, loading };
}
