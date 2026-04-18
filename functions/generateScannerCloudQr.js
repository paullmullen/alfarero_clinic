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

export const generateScannerCloudQr = onRequest({ cors: false }, (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const authHeader = req.headers.authorization || "";

      if (
        !authHeader ||
        authHeader !== `Bearer ${process.env.SCANNER_QR_ADMIN_TOKEN}`
      ) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payload = {
        kind: "cloud_config",
        version: 1,
        endpoint_url: process.env.SCANNER_ENDPOINT_URL,
        shared_secret: process.env.SCANNER_SHARED_SECRET,
      };

      const qrValue = `MMCFG:${JSON.stringify(payload)}`;

      return res.json({
        ok: true,
        qrValue,
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
