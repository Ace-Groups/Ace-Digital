import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { getCorsOptions } from "./lib/cors";

const app: Express = express();

// Firebase Hosting / Cloud Functions set X-Forwarded-*; required for express-rate-limit.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors(getCorsOptions()));
// Chat messages may include compressed inline attachments (see MAX_ATTACHMENT_DATA_URL_LENGTH).
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { error: "Too many login attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const WEB_APP_URL = "https://acedigital.cc";

function sendServiceRoot(_req: express.Request, res: express.Response): void {
  res.json({
    service: "Ace Digital API",
    status: "ok",
    webApp: WEB_APP_URL,
    health: "/api/healthz",
    apiPrefix: "/api",
    hint: "Use the web app URL for the UI. API routes live under /api/v1/...",
  });
}

/** Cloud Function URL ends at /api — Express sees path / */
app.get("/", sendServiceRoot);
app.get("/api", sendServiceRoot);
app.get("/api/", sendServiceRoot);

/** Convenience when testing the function URL directly (…/api/api/healthz → path /api/healthz) */
app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiLimiter);
app.use("/api/v1/auth/login", loginLimiter);
app.use("/api", router);

export default app;
