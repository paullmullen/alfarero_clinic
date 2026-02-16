"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { sendEmail } = require("./email/sendemail");

if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();

/**
 * Configure recipients via env var (fast + simple):
 *   INVENTORY_MANAGER_EMAILS="a@x.com,b@y.com"
 *
 * Later we can load recipients from Firestore users/permissions if you want.
 */

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getUserByAuthUid(uid) {
  const snap = await db
    .collection("users")
    .where("uid", "==", uid)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  return doc ? { id: doc.id, ...doc.data() } : null;
}

function buildHtml({ locations, items, countsByLocationId }) {
  // Header rows:
  // Row 1: Item | Location1 (colspan=2) | Location2 (2) | ... | Total (2)
  // Row 2: Par | Current for each location + totals
  const thStyle =
    "border:1px solid #ddd;padding:6px 8px;background:#fafafa;text-align:left;white-space:nowrap;";
  const tdStyle = "border:1px solid #ddd;padding:6px 8px;white-space:nowrap;";
  const numStyle = tdStyle + "text-align:right;";

  const headerRow1 =
    `<tr>` +
    `<th style="${thStyle}" rowspan="2">Item</th>` +
    locations
      .map(
        (loc) =>
          `<th style="${thStyle};text-align:center;" colspan="2">${escapeHtml(loc.name)}</th>`,
      )
      .join("") +
    `<th style="${thStyle};text-align:center;" colspan="2">Total</th>` +
    `</tr>`;

  const headerRow2 =
    `<tr>` +
    locations
      .map(
        () =>
          `<th style="${thStyle};text-align:right;">Par</th><th style="${thStyle};text-align:right;">Current</th>`,
      )
      .join("") +
    `<th style="${thStyle};text-align:right;">Par</th><th style="${thStyle};text-align:right;">Current</th>` +
    `</tr>`;

  // Body
  const bodyRows = items
    .map((it) => {
      let totalPar = 0;
      let totalCurrent = 0;

      // Determine if any location is below par to highlight the row
      let anyBelow = false;

      const cells = locations
        .map((loc) => {
          const counts = countsByLocationId.get(loc.id) || new Map();
          const c = counts.get(it.id) || {};
          const par = Number(c.par ?? 0);
          const cur = Number(c.current ?? 0);

          totalPar += par;
          totalCurrent += cur;
          if (par > 0 && cur < par) anyBelow = true;

          return (
            `<td style="${numStyle}">${par}</td>` +
            `<td style="${numStyle}">${cur}</td>`
          );
        })
        .join("");

      // Optional: skip rows where everything is zero everywhere
      // If you want *all* items shown, comment this out.
      if (totalPar === 0 && totalCurrent === 0) return "";

      const rowStyle = anyBelow ? ' style="background:#fff1f0;"' : "";
      return (
        `<tr${rowStyle}>` +
        `<td style="${tdStyle};font-weight:600;">${escapeHtml(it.name)}</td>` +
        cells +
        `<td style="${numStyle};font-weight:600;">${totalPar}</td>` +
        `<td style="${numStyle};font-weight:600;">${totalCurrent}</td>` +
        `</tr>`
      );
    })
    .filter(Boolean)
    .join("");

  return `
    <div style="font-family:Arial, sans-serif; line-height:1.35;">
      <h2 style="margin:0 0 10px;">Inventory Report (All Active Locations)</h2>
      <p style="margin:0 0 14px;color:#555;">
        Highlighted rows indicate at least one location is below par.
      </p>
      <div style="overflow-x:auto;">
        <table style="border-collapse:collapse;width:100%;min-width:900px;">
          <thead>
            ${headerRow1}
            ${headerRow2}
          </thead>
          <tbody>
            ${bodyRows || `<tr><td style="${tdStyle}" colspan="${1 + locations.length * 2 + 2}"><i>No inventory rows to display.</i></td></tr>`}
          </tbody>
        </table>
      </div>
      <p style="margin-top:14px;color:#777;font-size:12px;">
        Generated automatically from the clinic inventory system.
      </p>
    </div>
  `;
}

exports.sendInventoryReport = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 120,
    secrets: ["GMAIL_USER", "GMAIL_APP_PASSWORD"],
  },
  async (request) => {
    // 1) Auth required
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    // 2) Permission required
    const user = await getUserByAuthUid(request.auth.uid);

    // Allow any of these until your new permission column exists everywhere
    const canSend =
      !!user?.permissions?.settings ||
      !!user?.permissions?.inventory_edit ||
      !!user?.permissions?.inventory_send;

    if (!canSend) {
      throw new HttpsError(
        "permission-denied",
        "Missing permission to send inventory report.",
      );
    }

    // 3) Recipients
    const recipients = (process.env.INVENTORY_MANAGER_EMAILS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!recipients.length) {
      throw new HttpsError(
        "failed-precondition",
        "INVENTORY_MANAGER_EMAILS is not configured.",
      );
    }

    // 4) Load ACTIVE locations
    const locSnap = await db
      .collection("locations")
      .where("active", "==", true)
      .get();
    const locations = locSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    if (!locations.length) {
      throw new HttpsError("failed-precondition", "No active locations found.");
    }

    // 5) Load ACTIVE inventory items (catalog)
    const itemsSnap = await db
      .collection("inventory_items")
      .where("isActive", "==", true)
      .get();
    const items = itemsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    // 6) Load counts for each active location in parallel
    const countsByLocationId = new Map(); // locationId -> Map(itemId -> counts)
    await Promise.all(
      locations.map(async (loc) => {
        const countsSnap = await db
          .collection("locations")
          .doc(loc.id)
          .collection("inventory_counts")
          .get();
        const m = new Map();
        countsSnap.docs.forEach((d) => m.set(d.id, d.data()));
        countsByLocationId.set(loc.id, m);
      }),
    );

    // 7) Build email HTML
    const html = buildHtml({ locations, items, countsByLocationId });

    // 8) Send
    await sendEmail({
      to: recipients.join(","),
      subject: "Inventory Report — All Active Locations",
      html,
    });

    // 9) Optional: log an audit record (nice to have)
    await db.collection("inventory_reports").add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: user?.name || user?.email || request.auth.uid,
      type: "ALL_ACTIVE_LOCATIONS",
      recipients,
      activeLocationCount: locations.length,
      activeItemCount: items.length,
    });

    return { ok: true };
  },
);
