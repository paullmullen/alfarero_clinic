"use strict";

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const cors = require("cors");

const {
  fetchObservationTypes,
  fetchOpsObservationsByYmdRange,
} = require("./ops/queries");

if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();

function getParam(req, key) {
  return (req.query?.[key] ?? req.body?.[key] ?? "").toString().trim();
}

const ALLOWED_ORIGINS = new Set([
  "https://multimedica.org",
  "https://localhost:3000",
  "https://alfarero-478ad--expire-o4gpaz9l.web.app",
]);

const corsMiddleware = cors({
  origin: (origin, cb) => {
    // allow curl / server-to-server (no Origin header)
    if (!origin) return cb(null, true);

    if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);

    // IMPORTANT: return false (no CORS) for disallowed origins
    return cb(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

exports.getOpsObservationsFeed = onRequest(
  { timeoutSeconds: 60 },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      // Explicitly answer preflight
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      try {
        const startYMD = getParam(req, "startYMD");
        const endYMD = getParam(req, "endYMD");

        if (!startYMD || !endYMD) {
          return res
            .status(400)
            .json({ error: "startYMD and endYMD are required" });
        }

        const [typesById, observations] = await Promise.all([
          fetchObservationTypes({ db }),
          fetchOpsObservationsByYmdRange({
            db,
            startYMD,
            endYMD,
            limitN: 1500,
          }),
        ]);

        return res.status(200).json({ typesById, observations });
      } catch (err) {
        console.error("getOpsObservationsFeed error:", err);
        return res.status(500).json({ error: err?.message ?? String(err) });
      }
    });
  },
);
