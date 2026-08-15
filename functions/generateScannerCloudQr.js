import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import admin from "firebase-admin";
import corsFactory from "cors";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const qrAdminToken = defineSecret("SCANNER_QR_ADMIN_TOKEN");
const scannerSharedSecret = defineSecret("SCANNER_SHARED_SECRET");

const corsHandler = corsFactory({
  origin: [
    /^http:\/\/localhost(:\d+)?$/,
    /^https:\/\/localhost(:\d+)?$/,
    "https://multimedica.org",
    "https://alfarero-478ad--test-712c1z2l.web.app",
  ],
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 3600,
});

function buildQrValue(payload) {
  return `MMCFG:${JSON.stringify(payload)}`;
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

function validateWifiPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "Missing wifi payload";
  }
  if (!payload.ssid) return "Missing ssid";
  if (payload.password === undefined) return "Missing password";
  if (!["wpa-psk", "none"].includes(payload.security || "wpa-psk")) {
    return "Invalid security value";
  }
  return null;
}

function validateEndpointUrl(endpointUrl) {
  return typeof endpointUrl === "string" && /^https:\/\//.test(endpointUrl);
}

export function createGenerateScannerCloudQrHandler({
  verifyIdToken = (token) => admin.auth().verifyIdToken(token),
  findUserByAuthUid = getUserByAuthUid,
  getAdminToken = () => qrAdminToken.value(),
  getSharedSecret = () => scannerSharedSecret.value(),
  endpointUrl = process.env.SCANNER_ENDPOINT_URL,
  logger = () => {},
} = {}) {
  return async function handleGenerateScannerCloudQr(req, res) {
    try {
      const authHeader = req.headers.authorization || "";
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }

      let decoded;
      try {
        decoded = await verifyIdToken(match[1]);
      } catch {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }

      const user = await findUserByAuthUid(decoded.uid);
      if (!user?.permissions?.settings) {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }

      const kind = req.body?.kind || "cloud_config";
      if (!["cloud_config", "station_config", "wifi_config"].includes(kind)) {
        return res.status(400).json({
          ok: false,
          error: `Unsupported QR kind: ${kind}`,
        });
      }

      const adminToken = getAdminToken();
      if (!adminToken) {
        return res.status(500).json({
          ok: false,
          error: "QR generation unavailable",
        });
      }

      if (kind === "cloud_config") {
        const sharedSecret = getSharedSecret();
        if (!sharedSecret || !validateEndpointUrl(endpointUrl)) {
          return res.status(500).json({
            ok: false,
            error: "QR generation unavailable",
          });
        }

        const payload = {
          kind: "cloud_config",
          version: 1,
          payload: {
            endpoint_url: endpointUrl,
            shared_secret: sharedSecret,
          },
          auth: {
            admin_token: adminToken,
          },
        };

        return res.json({
          ok: true,
          kind,
          qrValue: buildQrValue(payload),
        });
      }

      if (kind === "station_config") {
        const { location_id, room_id, station_id, device_id } = req.body || {};

        if (!location_id) {
          return res.status(400).json({
            ok: false,
            error: "Missing location_id",
          });
        }

        if (!room_id) {
          return res.status(400).json({
            ok: false,
            error: "Missing room_id",
          });
        }

        if (!station_id) {
          return res.status(400).json({
            ok: false,
            error: "Missing station_id",
          });
        }

        if (!device_id) {
          return res.status(400).json({
            ok: false,
            error: "Missing device_id",
          });
        }

        const payload = {
          kind: "station_config",
          version: 1,
          payload: {
            location_id,
            room_id,
            station_id,
            device_id,
          },
          auth: {
            admin_token: adminToken,
          },
        };

        return res.json({
          ok: true,
          kind,
          qrValue: buildQrValue(payload),
        });
      }

      if (kind === "wifi_config") {
        const payload = req.body?.payload || req.body;
        const validationError = validateWifiPayload(payload);
        if (validationError) {
          return res.status(400).json({ ok: false, error: validationError });
        }

        const qrPayload = {
          kind: "wifi_config",
          version: 1,
          payload: {
            ssid: payload.ssid,
            password: payload.password,
            security: payload.security || "wpa-psk",
          },
          auth: {
            admin_token: adminToken,
          },
        };

        return res.json({
          ok: true,
          kind,
          qrValue: buildQrValue(qrPayload),
        });
      }

      return res.status(400).json({ ok: false, error: "Invalid QR request" });
    } catch (err) {
      logger("generateScannerCloudQr failed");

      return res.status(500).json({
        ok: false,
        error: "QR generation failed",
      });
    }
  };
}

export const scannerQrCorsHandler = corsHandler;

const generateScannerCloudQrHandler = createGenerateScannerCloudQrHandler();

export const generateScannerCloudQr = onRequest(
  {
    cors: false,
    secrets: [qrAdminToken, scannerSharedSecret],
  },
  (req, res) => {
    corsHandler(req, res, () => generateScannerCloudQrHandler(req, res));
  },
);
