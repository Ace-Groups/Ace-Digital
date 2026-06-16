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
  if (process.env.FIREBASE_STORAGE_BUCKET?.trim()) {
    return getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET.trim());
  }
  try {
    const bucket = getStorage().bucket();
    if (bucket && bucket.name) return bucket;
  } catch (err) {
    logger.debug({ err }, "No default bucket, using project-based resolution");
  }
  const projectId =
    process.env.GCLOUD_PROJECT ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    "ace-digital-os";
  return getStorage().bucket(`${projectId}.firebasestorage.app`);
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
      let uploadedToGcs = false;
      // Attempt GCS upload in production, or if service account JSON is set, or in Cloud Functions
      const attemptGcs =
        !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
        !!process.env.FIREBASE_CONFIG ||
        process.env.NODE_ENV === "production";

      if (attemptGcs) {
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
          uploadedToGcs = true;
        } catch (err) {
          logger.warn({ err, path }, "HR document GCS upload failed, falling back to local file storage");
        }
      }

      if (!uploadedToGcs) {
        // Fallback: save to local disk
        const fsLib = await import("fs/promises");
        const pathLib = await import("path");
        const dir = pathLib.join(process.cwd(), "uploads", "hr-documents", uploadId);
        await fsLib.mkdir(dir, { recursive: true });
        await fsLib.writeFile(pathLib.join(dir, safeName), buffer);
        logger.info({ path: pathLib.join(dir, safeName) }, "Saved HR document to local file storage");
      }

      const url = `/api/v1/hr-documents/${uploadId}/${safeName}`;

      res.status(201).json({
        name: safeName,
        type: mime,
        size: buffer.length,
        url,
        storagePath: path,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn({ err, path }, "HR document upload failed");
      res.status(500).json({ error: "Could not upload document" });
    }
  },
);

router.get(
  "/v1/hr-documents/:uploadId/:fileName",
  requireAuth,
  requirePermission("employees:read"),
  async (req, res): Promise<void> => {
    const { uploadId, fileName } = req.params;
    const path = `hr-documents/${uploadId}/${fileName}`;
    try {
      const fsLib = await import("fs/promises");
      const pathLib = await import("path");
      const localFilePath = pathLib.join(process.cwd(), "uploads", "hr-documents", uploadId, fileName);
      
      let localExists = false;
      try {
        await fsLib.access(localFilePath);
        localExists = true;
      } catch {
        // local file doesn't exist
      }

      if (localExists) {
        const ext = fileName.split(".").pop()?.toLowerCase();
        let contentType = "application/octet-stream";
        if (ext === "pdf") contentType = "application/pdf";
        else if (ext === "png") contentType = "image/png";
        else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
        else if (ext === "gif") contentType = "image/gif";
        else if (ext === "webp") contentType = "image/webp";

        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
        
        const fs = await import("fs");
        fs.createReadStream(localFilePath).pipe(res);
        return;
      }

      // Fallback: Stream from Firebase Storage
      const bucket = storageBucket();
      const file = bucket.file(path);
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      const [metadata] = await file.getMetadata();
      res.setHeader("Content-Type", metadata.contentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
      file.createReadStream().pipe(res);
    } catch (err) {
      logger.warn({ err, path }, "Failed to stream HR document");
      res.status(500).json({ error: "Could not retrieve document" });
    }
  },
);

export default router;
