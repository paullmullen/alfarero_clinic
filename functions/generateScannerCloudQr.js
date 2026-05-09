import { onRequest } from "firebase-functions/v2/https";
import corsFactory from "cors";

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

export const generateScannerCloudQr = onRequest({ cors: false }, (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const authHeader = req.headers.authorization || "";

      if (
        !authHeader ||
        authHeader !== `Bearer ${process.env.SCANNER_QR_ADMIN_TOKEN}`
      ) {
        return res.status(401).json({
          ok: false,
          error: "Unauthorized",
        });
      }

      const kind = req.body?.kind || "cloud_config";

      if (kind === "cloud_config") {
        const payload = {
          kind: "cloud_config",
          version: 1,
          payload: {
            endpoint_url: process.env.SCANNER_ENDPOINT_URL,
            shared_secret: process.env.SCANNER_SHARED_SECRET,
          },
          auth: {
            admin_token: process.env.SCANNER_QR_ADMIN_TOKEN,
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
            admin_token: process.env.SCANNER_QR_ADMIN_TOKEN,
          },
        };

        return res.json({
          ok: true,
          kind,
          qrValue: buildQrValue(payload),
        });
      }

      return res.status(400).json({
        ok: false,
        error: `Unsupported QR kind: ${kind}`,
      });
    } catch (err) {
      console.error("generateScannerCloudQr error:", err);

      return res.status(500).json({
        ok: false,
        error: err.message,
      });
    }
  });
});
