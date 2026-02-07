// src/pages/Registro/utils/phone.js

export function normalizePhone(raw) {
  const digits = (raw ?? "").toString().replace(/\D/g, "");
  if (!digits) return null;

  // local -> add country code (Guatemala)
  if (digits.length === 8) return `502${digits}`;

  // already country-coded
  if (digits.length === 11 && digits.startsWith("502")) return digits;

  // fallback: return whatever digits we got
  return digits;
}
