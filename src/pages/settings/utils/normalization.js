// normalization.js

// Case-insensitive normalization of keys
export const normalizeKey = (key) =>
  (key ?? "").toString().trim().toLowerCase();

// Retrieve a value from a sheet row using case-insensitive column name
export const getValueCI = (row, targetName) => {
  const target = normalizeKey(targetName);
  for (const k of Object.keys(row)) {
    if (normalizeKey(k) === target) return row[k];
  }
  return undefined;
};

// DPI helpers
export const cleanId = (raw) =>
  (raw ?? "").toString().replace(/\D/g, "").slice(0, 13);

export const isValid13 = (digits) => /^\d{13}$/.test(digits);

// Parse age from dd/mm/yyyy or numeric
export const parseAgeYears = (raw) => {
  const txt = (raw ?? "").toString().trim();
  if (!txt) return null;

  // dd/mm/yyyy
  const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yyyy = y.length === 2 ? (Number(y) > 30 ? `19${y}` : `20${y}`) : y;
    const birth = new Date(
      `${yyyy.toString().padStart(4, "0")}-${mo
        .toString()
        .padStart(2, "0")}-${d.toString().padStart(2, "0")}`,
    );
    if (!isNaN(birth)) {
      const today = new Date();
      let years = today.getFullYear() - birth.getFullYear();
      const before =
        today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() &&
          today.getDate() < birth.getDate());
      if (before) years -= 1;
      return Math.max(0, years);
    }
  }

  // Numeric age
  const n = Number(txt.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export const inferAgeGroup = (years) =>
  years !== null && years < 18 ? "child" : "adult";

// Normalize telephone values (consistent with Settings.js + Registro.js)
export const normalizePhone = (raw) => {
  const digits = (raw ?? "").toString().replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 8) return `502${digits}`; // local → add country code
  if (digits.length === 11 && digits.startsWith("502")) return digits;
  return digits;
};
