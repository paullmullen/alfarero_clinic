// src/hooks/useEmailTrigger.js
import { useState, useCallback } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";

/**
 * TEMPORARY DEVELOPMENT SWITCH
 *
 * Set this to a positive integer when you want the manual daily-email trigger
 * to behave as though "today" were N days earlier.
 *
 * Example:
 *   TEMP_REPORT_SHIFT_DAYS = 3
 * means:
 *   "Build the report as if it were 3 clinic-days ago."
 *
 * IMPORTANT:
 * - This is intended for development/debugging only.
 * - Leave this at 0 for normal behavior.
 * - The cloud endpoint will assume 0 if this value is omitted.
 * - Because this value is sent in the request body, it works even when the
 *   frontend is running on localhost and the backend is deployed in the cloud.
 */
const TEMP_REPORT_SHIFT_DAYS = 0;

/**
 * useEmailTrigger
 *
 * Handles calling the Cloud Run endpoint that sends your daily email.
 *
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
      const payload = {};

      // Development-only override:
      // only send reportShiftDays when it is a non-zero integer.
      if (
        Number.isInteger(TEMP_REPORT_SHIFT_DAYS) &&
        TEMP_REPORT_SHIFT_DAYS !== 0
      ) {
        payload.reportShiftDays = TEMP_REPORT_SHIFT_DAYS;
      }

      const res = await fetch(
        "https://manualdailyemail-3tomq62xlq-uc.a.run.app",
        {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
