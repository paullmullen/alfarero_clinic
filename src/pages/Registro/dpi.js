// src/pages/Registro/utils/dpi.js

export function toRawDpi(val) {
  return (val || "").toString().replace(/\D/g, "").slice(0, 13);
}

export function formatDpi(rawDigits13) {
  const v = (rawDigits13 || "").replace(/\D/g, "").slice(0, 13);

  if (v.length <= 4) return v;
  if (v.length <= 9) return `${v.slice(0, 4)} ${v.slice(4)}`;
  return `${v.slice(0, 4)} ${v.slice(4, 9)} ${v.slice(9, 13)}`;
}
