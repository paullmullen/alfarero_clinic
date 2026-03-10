import { defineSecret } from "firebase-functions/params";

export const MAIL_PROVIDER = defineSecret("MAIL_PROVIDER"); // "gmail" | "graph"

export async function sendEmail(opts) {
  const provider = (MAIL_PROVIDER.value() || "gmail").trim().toLowerCase();
  console.error("[dailyEmail mail] provider:", provider);

  if (provider === "graph") {
    const graph = await import("./msGraphMailer.js");
    return graph.sendEmail(opts);
  }

  const gmail = await import("./gmailSmtpMailer.js");
  return gmail.sendEmail(opts);
}
