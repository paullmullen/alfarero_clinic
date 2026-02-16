"use strict";

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");

const { sendEmail } = require("./email/mailer");

if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();

/**
 * Firestore trigger:
 *   - UI creates a doc in inventory_reports
 *   - This function triggers, builds the report, emails it, and updates the doc.
 *
 * Recipient rule:
 *   users where permissions.inventory_edit == true
 */

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getInventoryRecipientsFromUsers() {
  const snap = await db
    .collection("users")
    .where("permissions.inventory_edit", "==", true)
    .get();

  const emails = [];
  snap.forEach((d) => {
    const u = d.data() || {};
    if (u.email) emails.push(String(u.email).trim());
  });

  // De-dupe + strip empties
  return [...new Set(emails)].filter(Boolean);
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
          `<th style="${thStyle};text-align:center;" colspan="2">${escapeHtml(
            loc.name,
          )}</th>`,
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
            ${
              bodyRows ||
              `<tr><td style="${tdStyle}" colspan="${1 + locations.length * 2 + 2}"><i>No inventory rows to display.</i></td></tr>`
            }
          </tbody>
        </table>
      </div>
      <p style="margin-top:14px;color:#777;font-size:12px;">
        Generated automatically from the clinic inventory system.
      </p>
    </div>
  `;
}

exports.sendInventoryReport = onDocumentCreated(
  {
    document: "inventory_reports/{reportId}",
    region: "us-central1",
    timeoutSeconds: 120,
    secrets: ["GMAIL_USER", "GMAIL_APP_PASSWORD"],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const reportId = event.params.reportId;
    const report = snap.data() || {};

    logger.info("[sendInventoryReport] triggered", {
      reportId,
      project: process.env.GCLOUD_PROJECT,
    });

    // Mark processing early so you can see it in Firestore
    await snap.ref.set(
      {
        emailStatus: "processing",
        emailStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    try {
      // 1) Recipients (permissions.inventory_edit == true)
      const recipients = await getInventoryRecipientsFromUsers();
      if (!recipients.length) {
        throw new Error(
          "No recipients found: users.permissions.inventory_edit == true",
        );
      }

      // 2) Load ACTIVE locations
      const locSnap = await db
        .collection("locations")
        .where("active", "==", true)
        .get();

      const locations = locSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        );

      if (!locations.length) {
        throw new Error("No active locations found.");
      }

      // 3) Load ACTIVE inventory items (catalog)
      const itemsSnap = await db
        .collection("inventory_items")
        .where("isActive", "==", true)
        .get();

      const items = itemsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        );

      // 4) Load counts for each active location in parallel
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

      // 5) Build email HTML (your exact logic)
      const html = buildHtml({ locations, items, countsByLocationId });

      // Optional: include note/location in subject/body if you want
      // (Your current report is "All Active Locations" regardless)
      const subject = "Inventory Report — All Active Locations";

      logger.info("[sendInventoryReport] sending email", {
        reportId,
        recipientCount: recipients.length,
      });

      // 6) Send
      const emailResult = await sendEmail({
        to: recipients.join(","),
        subject,
        html,
      });

      // 7) Update the SAME report doc with results
      await snap.ref.set(
        {
          emailStatus: "sent",
          emailFinishedAt: admin.firestore.FieldValue.serverTimestamp(),
          recipients,
          emailResult: emailResult ?? null,
          // Preserve whatever the UI wrote (createdAt, createdBy, note, locationId, etc.)
        },
        { merge: true },
      );

      logger.info("[sendInventoryReport] sent OK", { reportId });
    } catch (err) {
      logger.error("[sendInventoryReport] FAILED", { reportId, err });

      await snap.ref.set(
        {
          emailStatus: "failed",
          emailFinishedAt: admin.firestore.FieldValue.serverTimestamp(),
          emailError: err?.message || String(err),
        },
        { merge: true },
      );

      throw err;
    }
  },
);
