// src/hooks/useEmailTrigger.js
import { useState, useCallback } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { auth } from "../helpers/firebaseConfig";

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
  const [testLoading, setTestLoading] = useState(false);
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

  const triggerTestEmail = useCallback(async (kind, reportShiftDays = 0) => {
    setTestLoading(true);
    try {
      if (!auth.currentUser) throw new Error(t("TEST_EMAIL_SIGN_IN", { defaultValue: "Sign in to send a test." }));
      const token = await auth.currentUser.getIdToken();
      const projectId = auth.app.options.projectId;
      const res = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/testOperationalEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind, reportShiftDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.status === "no_data") {
        message.info(t("TEST_EMAIL_NO_DATA", { defaultValue: "No completed visits or operational observations for that date. Try an earlier date." }));
      } else {
        message.success(t("TEST_EMAIL_SENT", { defaultValue: "Test sent only to {{email}}", email: data.recipient }));
      }
    } catch (error) {
      message.error(`${t("EMAIL_SEND_ERROR")}: ${error.message}`);
    } finally {
      setTestLoading(false);
    }
  }, [t]);

  return { triggerEmail, loading, triggerTestEmail, testLoading };
}
