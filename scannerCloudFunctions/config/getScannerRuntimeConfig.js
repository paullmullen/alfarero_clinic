import admin from "firebase-admin";

const db = admin.firestore();

const CONFIG_COLLECTION = "system_config";
const CONFIG_DOC_ID = "scanner_runtime";

const DEFAULT_CONFIG = {
  duplicate_scan_window_ms: 3000,
};

const CACHE_TTL_MS = 60 * 1000;

let cachedConfig = null;
let cachedAtMs = 0;

function sanitizeConfig(raw = {}) {
  const config = { ...DEFAULT_CONFIG };

  if (
    Number.isFinite(raw.duplicate_scan_window_ms) &&
    raw.duplicate_scan_window_ms >= 0
  ) {
    config.duplicate_scan_window_ms = raw.duplicate_scan_window_ms;
  }

  return config;
}

export async function getScannerRuntimeConfig({ forceRefresh = false } = {}) {
  const nowMs = Date.now();

  if (!forceRefresh && cachedConfig && nowMs - cachedAtMs < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const snap = await db
      .collection(CONFIG_COLLECTION)
      .doc(CONFIG_DOC_ID)
      .get();

    if (!snap.exists) {
      cachedConfig = { ...DEFAULT_CONFIG };
      cachedAtMs = nowMs;
      return cachedConfig;
    }

    const raw = snap.data() || {};
    cachedConfig = sanitizeConfig(raw);
    cachedAtMs = nowMs;
    return cachedConfig;
  } catch (error) {
    console.error(
      "[DEBUG] Failed to load scanner runtime config, using defaults",
      {
        error: error.message,
      },
    );

    cachedConfig = { ...DEFAULT_CONFIG };
    cachedAtMs = nowMs;
    return cachedConfig;
  }
}

export { DEFAULT_CONFIG };
