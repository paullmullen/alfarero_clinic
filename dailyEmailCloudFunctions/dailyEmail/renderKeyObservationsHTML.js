function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function dotForImpact(impact) {
  const color = impact === "positive" ? "#34A853" : "#D93025";
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>`;
}

export function renderKeyObservationsHTML({
  top3,
  remaining,
  dashboardUrl,
  labelForKey, // optional
}) {
  const items = Array.isArray(top3) ? top3 : [];

  const rows = items
    .map((o) => {
      const impact = o?.type?.impact ?? "negative";
      const icon = dotForImpact(impact);

      const titleKey =
        o?.type?.labelKey || o?.typeLabelKey || o?.typeId || "Observación";
      const title =
        typeof labelForKey === "function" ? labelForKey(titleKey) : titleKey;

      const notes = escapeHtml(o?.notes ?? "");
      const services = Array.isArray(o?.servicesAffected)
        ? o.servicesAffected
        : [];
      const servicesStr = services.length
        ? ` <span style="color:#666;">(${escapeHtml(services.join(", "))})</span>`
        : "";

      return `
        <div style="margin:0 0 10px 0; line-height:1.25;">
          <div style="font-weight:700; display:flex; align-items:center;">
            <span style="display:inline-block; width:18px; line-height:0;">${icon}</span>
            <span>${escapeHtml(o?.ymd ?? "")} — ${escapeHtml(title)}</span>
          </div>
          <div style="color:#222; margin-left:18px;">${notes}${servicesStr}</div>
        </div>
      `;
    })
    .join("");

  const moreLine =
    remaining > 0
      ? `<div style="margin-top:6px; color:#666;">y ${remaining} más en los últimos 14 días</div>`
      : "";

  const emptyLine = `<div style="color:#666;">No se registraron observaciones en este período.</div>`;

  const linkLine = dashboardUrl
    ? `
      <div style="margin-top:10px;">
        <a href="${dashboardUrl}" style="color:#1a73e8; font-weight:700; text-decoration:none;">
          Ver gráfico interactivo y detalles →
        </a>
      </div>
    `
    : "";

  return `
    <div style="margin:0 0 30px 0; text-align:left;">
      <div style="margin:0 0 10px 0; font-family:Arial,sans-serif; font-size:16px; font-weight:700;">
        Observaciones Clave
      </div>
      ${rows || emptyLine}
      ${moreLine}
      ${linkLine}
    </div>
  `;
}
