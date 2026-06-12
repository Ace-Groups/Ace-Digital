import { Router } from "express";
import { ensureFirebaseAdminApp } from "@workspace/db";
import { getStorage } from "firebase-admin/storage";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/rbac-middleware";
import { logger } from "../lib/logger";

const router = Router();
const MAX_BYTES = 10 * 1024 * 1024;

function storageBucket() {
  ensureFirebaseAdminApp();
  const projectId =
    process.env.GCLOUD_PROJECT ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    "ace-digital-os";
  const name =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ??
    `${projectId}.firebasestorage.app`;
  return getStorage().bucket(name);
}

router.post(
  "/v1/hr-documents",
  requireAuth,
  requirePermission("employees:write"),
  async (req, res): Promise<void> => {
    const { fileName, contentType, dataBase64 } = req.body as {
      fileName?: string;
      contentType?: string;
      dataBase64?: string;
    };

    if (!fileName || !dataBase64) {
      res.status(400).json({ error: "fileName and dataBase64 are required" });
      return;
    }

    const safeName = String(fileName).replace(/[^\w.-]+/g, "_").slice(0, 120) || "document";
    const mime =
      typeof contentType === "string" && contentType.trim()
        ? contentType.trim()
        : "application/octet-stream";

    let buffer: Buffer;
    try {
      buffer = Buffer.from(dataBase64, "base64");
    } catch {
      res.status(400).json({ error: "Invalid file data" });
      return;
    }

    if (!buffer.length) {
      res.status(400).json({ error: "Empty file" });
      return;
    }
    if (buffer.length > MAX_BYTES) {
      res.status(400).json({ error: "File must be 10 MB or smaller" });
      return;
    }

    const uploadId = crypto.randomUUID();
    const path = `hr-documents/${uploadId}/${safeName}`;

    try {
      const bucket = storageBucket();
      const file = bucket.file(path);
      await file.save(buffer, {
        resumable: false,
        metadata: {
          contentType: mime,
          cacheControl: "private, max-age=3600",
        },
      });
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        name: safeName,
        type: mime,
        size: buffer.length,
        url: signedUrl,
        storagePath: path,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn({ err, path }, "HR document upload failed");
      res.status(500).json({ error: "Could not upload document" });
    }
  },
);

export default router;
