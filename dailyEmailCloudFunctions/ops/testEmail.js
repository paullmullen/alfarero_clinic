import { getClinicYMD } from "../dailyEmail/time.js";

// Recipient is derived from Firebase Auth, never from request data or the mailing list.
export function createTestEmailHandler({ db, auth, sendDailyEmails, sendWeeklyOperationalEmail, sendEmail }) {
  return async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    let caller;
    try {
      if (!token) throw new Error("Missing token");
      caller = await auth.verifyIdToken(token, true);
    } catch {
      return res.status(401).json({ error: "Sign in again to send a test." });
    }
    try {
      const record = await db.collection("users").doc(caller.uid).get();
      const rawPermissions = record.data()?.permissions;
      const permissions = Array.isArray(rawPermissions) ? rawPermissions[0] : rawPermissions;
      if (!record.exists || !(permissions?.stats === true || permissions?.settings === true || permissions?.dailyEmail === true)) {
        return res.status(403).json({ error: "Email report access is required." });
      }
      const user = await auth.getUser(caller.uid);
      if (!user.email || user.disabled) {
        return res.status(403).json({ error: "An email address on your active account is required." });
      }
      const { kind, reportShiftDays = 0 } = req.body ?? {};
      if (!["daily", "weekly"].includes(kind) || !Number.isInteger(reportShiftDays) || reportShiftDays < 0 || reportShiftDays > 14) {
        return res.status(400).json({ error: "Choose daily or weekly and an offset from 0 to 14 days." });
      }
      const recipient = user.email;
      const recipientsOverride = [{ email: recipient }];
      // Defense in depth: the transport also refuses any recipient expansion.
      const sendTest = async (message) => {
        if (message.to !== recipient || message.cc || message.bcc) throw new Error("Invalid test recipient");
        return sendEmail({ ...message, subject: `[PRUEBA / TEST] ${message.subject}` });
      };
      const results = kind === "daily"
        ? await sendDailyEmails({ reportShiftDays, recipientsOverride, persist: false, send: sendTest })
        : await sendWeeklyOperationalEmail({ db, endDay: getClinicYMD(undefined, reportShiftDays), recipientsOverride, sendEmail: sendTest });
      if (!results.length) return res.status(200).json({ status: "no_data", recipient });
      if (results.some(r => r.status !== "sent")) return res.status(502).json({ error: "The email provider could not send the test." });
      return res.status(200).json({ status: "sent", recipient });
    } catch (error) {
      console.error("Test email failed", error.message);
      return res.status(500).json({ error: "The test could not be generated. Please try again." });
    }
  };
}
