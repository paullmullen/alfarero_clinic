import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import cors from "cors";

import {
  fetchObservationTypes,
  fetchOpsObservationsByYmdRange,
} from "./ops/queries.js";

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
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    return cb(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export const getOpsObservationsFeed = onRequest(
  { timeoutSeconds: 60 },
  (req, res) => {
    corsMiddleware(req, res, async () => {
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
