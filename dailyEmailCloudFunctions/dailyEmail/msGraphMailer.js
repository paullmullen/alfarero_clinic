import { defineSecret } from "firebase-functions/params";

export const O365_TENANT_ID = defineSecret("O365_TENANT_ID");
export const O365_CLIENT_ID = defineSecret("O365_CLIENT_ID");
export const O365_CLIENT_SECRET = defineSecret("O365_CLIENT_SECRET");
export const O365_SENDER = defineSecret("O365_SENDER");

let cachedToken = null;
let cachedTokenExpMs = 0;

async function getGraphToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpMs - 60_000) return cachedToken;

  const tenantId = (O365_TENANT_ID.value() || "").trim();
  const clientId = (O365_CLIENT_ID.value() || "").trim();
  const clientSecret = (O365_CLIENT_SECRET.value() || "").trim();

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const form = new URLSearchParams();
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("grant_type", "client_credentials");
  form.set("scope", "https://graph.microsoft.com/.default");

  const tokenResp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const tokenJson = await tokenResp.json().catch(() => ({}));
  if (!tokenResp.ok) {
    console.error("[graph] token error", tokenResp.status, tokenJson);
    throw new Error(`Failed to obtain Graph token (HTTP ${tokenResp.status}).`);
  }

  cachedToken = tokenJson.access_token;
  cachedTokenExpMs = Date.now() + Number(tokenJson.expires_in || 0) * 1000;

  console.error("[graph] token ok", {
    expiresIn: tokenJson.expires_in,
    tokenType: tokenJson.token_type,
    hasAccessToken: !!tokenJson.access_token,
  });

  return cachedToken;
}

function normalizeToList(to) {
  if (Array.isArray(to)) {
    return to.map((s) => String(s).trim()).filter(Boolean);
  }
  return String(to || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Convert nodemailer-style attachments to Graph API fileAttachment objects.
 */
function toGraphFileAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];

  return attachments.map((a, idx) => {
    const name = a?.filename || a?.name || `attachment-${idx + 1}`;
    const contentType = a?.contentType || "application/octet-stream";
    const encoding = String(a?.encoding || "").toLowerCase();

    const content = a?.content;
    if (content == null) {
      throw new Error(`[graph] attachment "${name}" missing content`);
    }

    let contentBytes;
    if (Buffer.isBuffer(content)) {
      contentBytes = content.toString("base64");
    } else if (content instanceof Uint8Array) {
      contentBytes = Buffer.from(content).toString("base64");
    } else if (typeof content === "string") {
      contentBytes =
        encoding === "base64"
          ? content.replace(/\s+/g, "")
          : Buffer.from(content, "utf8").toString("base64");
    } else {
      throw new Error(
        `[graph] attachment "${name}" has unsupported content type: ${typeof content}`,
      );
    }

    return {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name,
      contentType,
      contentBytes,
    };
  });
}

export async function sendEmail({ to, subject, html, attachments = [] }) {
  if (!to || !subject || !html) {
    throw new Error("sendEmail missing required fields: to, subject, html");
  }

  const sender = (O365_SENDER.value() || "").trim();
  if (!sender) throw new Error("Missing required secret: O365_SENDER");

  const toList = normalizeToList(to);
  const token = await getGraphToken();

  const graphAttachments = toGraphFileAttachments(attachments);

  const payload = {
    message: {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: toList.map((addr) => ({
        emailAddress: { address: addr },
      })),
      ...(graphAttachments.length ? { attachments: graphAttachments } : {}),
    },
    saveToSentItems: true,
  };

  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
    sender,
  )}/sendMail`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (resp.status !== 202) {
    const errText = await resp.text().catch(() => "");
    console.error("[graph] sendMail error", { status: resp.status, errText });
    throw new Error(`Graph sendMail failed (HTTP ${resp.status}).`);
  }

  console.error("[graph] sendMail accepted (202)", {
    toCount: toList.length,
    attachments: graphAttachments.length,
  });
}
