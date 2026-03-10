import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import ExcelJS from "exceljs";

// IMPORTANT: import the *mailer helper*, not the HTTP onRequest function.
import { sendEmail } from "./email/mailer.js";

if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();

/**
 * Firestore trigger:
 *  - UI adds doc to inventory_reports
 *  - This triggers, builds Excel report, emails it, and updates the doc with status
 *
 * Recipient rule:
 *  - users where permissions.inventory_edit == true
 */

// -------- helpers --------

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeStr(v) {
  return v == null ? "" : String(v);
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

  return [...new Set(emails)].filter(Boolean);
}

function ymdLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function buildInventoryWorkbook({
  locations,
  items,
  countsByLocationId,
  reportId,
  report,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Clinic Inventory System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Inventory", {
    views: [{ state: "frozen", ySplit: 2, xSplit: 1 }],
  });

  ws.getColumn(1).width = 30;

  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3B3F46" },
  };

  const headerBorder = {
    top: { style: "thin", color: { argb: "FF2A2E34" } },
    left: { style: "thin", color: { argb: "FF2A2E34" } },
    bottom: { style: "thin", color: { argb: "FF2A2E34" } },
    right: { style: "thin", color: { argb: "FF2A2E34" } },
  };

  const headerAlignCenter = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  const headerAlignRight = { vertical: "middle", horizontal: "right" };

  ws.getCell(1, 1).value = "Item";
  ws.mergeCells(1, 1, 2, 1);

  let col = 2;

  function writeGroup(groupName) {
    ws.mergeCells(1, col, 1, col + 1);
    ws.getCell(1, col).value = groupName;

    ws.getCell(2, col).value = "Current";
    ws.getCell(2, col + 1).value = "Minimum";

    ws.getColumn(col).width = 14;
    ws.getColumn(col + 1).width = 12;

    col += 2;
  }

  for (const loc of locations) {
    writeGroup(safeStr(loc.name || loc.id));
  }

  writeGroup("Total");

  const lastCol = col - 1;

  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = headerFill;
      cell.border = headerBorder;

      if (c === 1) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      } else if (r === 1) {
        cell.alignment = headerAlignCenter;
      } else {
        cell.alignment = headerAlignRight;
      }
    }
  }

  const groupSeparatorBorder = {
    right: { style: "medium", color: { argb: "FFFFFFFF" } },
  };

  let sepCol = 2;

  for (let i = 0; i < locations.length; i++) {
    const groupEndCol = sepCol + 1;

    ws.getCell(1, groupEndCol).border = {
      ...ws.getCell(1, groupEndCol).border,
      ...groupSeparatorBorder,
    };

    ws.getCell(2, groupEndCol).border = {
      ...ws.getCell(2, groupEndCol).border,
      ...groupSeparatorBorder,
    };

    sepCol += 2;
  }

  let rowIdx = 3;

  for (const it of items) {
    let totalPar = 0;
    let totalCur = 0;
    let anyBelow = false;

    const rowValues = [];
    for (const loc of locations) {
      const counts = countsByLocationId.get(loc.id) || new Map();
      const c = counts.get(it.id) || {};
      const par = Number(c.par ?? 0);
      const cur = Number(c.current ?? 0);

      totalPar += par;
      totalCur += cur;
      if (par > 0 && cur < par) anyBelow = true;

      rowValues.push(cur, par);
    }

    if (totalPar === 0 && totalCur === 0) continue;

    rowValues.push(totalCur, totalPar);

    ws.getCell(rowIdx, 1).value = safeStr(it.name ?? it.id);

    let c = 2;
    for (const v of rowValues) {
      ws.getCell(rowIdx, c).value = Number(v ?? 0);
      ws.getCell(rowIdx, c).alignment = { horizontal: "right" };
      c++;
    }

    for (let cc = 1; cc <= lastCol; cc++) {
      const cell = ws.getCell(rowIdx, cc);
      cell.border = headerBorder;
      if (anyBelow) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFE1E1" },
        };
      }
    }

    ws.getCell(rowIdx, 1).font = { bold: true };

    rowIdx++;
  }

  const meta = wb.addWorksheet("Meta");
  meta.columns = [
    { header: "Key", key: "k", width: 22 },
    { header: "Value", key: "v", width: 80 },
  ];
  meta.getRow(1).font = { bold: true };

  meta.addRow({ k: "Report ID", v: safeStr(reportId) });
  meta.addRow({ k: "Generated At", v: new Date().toISOString() });
  meta.addRow({
    k: "Created At (doc)",
    v: safeStr(report?.createdAt?.toDate?.()?.toISOString?.() || ""),
  });
  meta.addRow({ k: "Created By", v: safeStr(report?.createdBy) });
  meta.addRow({ k: "Location ID", v: safeStr(report?.locationId) });
  meta.addRow({ k: "Note", v: safeStr(report?.note) });
  meta.addRow({ k: "Active Locations", v: String(locations.length) });
  meta.addRow({ k: "Active Items", v: String(items.length) });

  return wb;
}

// -------- trigger --------

export const sendInventoryReport = onDocumentCreated(
  {
    document: "inventory_reports/{reportId}",
    region: "us-central1",
    timeoutSeconds: 120,
    secrets: [
      "MAIL_PROVIDER",
      "GMAIL_USER",
      "GMAIL_APP_PASSWORD",
      "O365_TENANT_ID",
      "O365_CLIENT_ID",
      "O365_CLIENT_SECRET",
      "O365_SENDER",
    ],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const reportId = event.params.reportId;
    const report = snap.data() || {};

    logger.info("[sendInventoryReport] triggered", {
      reportId,
      project: process.env.GCLOUD_PROJECT,
      locationId: report.locationId || null,
    });

    await snap.ref.set(
      {
        emailStatus: "processing",
        emailStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    try {
      const recipients = await getInventoryRecipientsFromUsers();
      if (!recipients.length) {
        throw new Error(
          "No recipients found: users.permissions.inventory_edit == true",
        );
      }

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

      const itemsSnap = await db
        .collection("inventory_items")
        .where("isActive", "==", true)
        .get();

      const items = itemsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        );

      const countsByLocationId = new Map();
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

      const workbook = await buildInventoryWorkbook({
        locations,
        items,
        countsByLocationId,
        reportId,
        report,
      });

      const xlsxBuffer = await workbook.xlsx.writeBuffer();
      const attachmentBuffer = Buffer.from(xlsxBuffer);
      const filename = `inventory-report-${ymdLocal(new Date())}.xlsx`;

      const html = `
        <div style="font-family:Arial, sans-serif; line-height:1.35;">
          <h2 style="margin:0 0 10px;">Inventory Report</h2>
          <p style="margin:0 0 10px;color:#555;">
            The inventory report is attached as an Excel file.
          </p>
          <p style="margin:0 0 6px;"><b>Submitted by:</b> ${escapeHtml(
            report.createdBy || "unknown",
          )}</p>
          <p style="margin:0 0 6px;"><b>Location:</b> ${escapeHtml(
            report.locationId || "",
          )}</p>
          ${
            report.note
              ? `<p style="margin:10px 0 6px;"><b>Note:</b></p>
                 <div style="padding:10px;border:1px solid #ddd;border-radius:6px;">
                   ${escapeHtml(report.note).replaceAll("\n", "<br/>")}
                 </div>`
              : ""
          }
        </div>
      `;

      logger.info("[sendInventoryReport] sending email", {
        reportId,
        recipientCount: recipients.length,
        attachmentBytes: xlsxBuffer?.byteLength || null,
      });

      const emailResult = await sendEmail({
        to: recipients.join(","),
        subject: "Inventory Report — All Active Locations",
        html,
        attachments: [
          {
            filename,
            content: attachmentBuffer,
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      });

      await snap.ref.set(
        {
          emailStatus: "sent",
          emailFinishedAt: admin.firestore.FieldValue.serverTimestamp(),
          recipients,
          emailResult: emailResult ?? null,
          attachment: { filename },
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
