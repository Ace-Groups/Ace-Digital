import { ensureFirebaseAdminApp, useFirestore, getPgDb, messagesTable } from "@workspace/db";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { lt, and, isNotNull, eq } from "drizzle-orm";
import { logger } from "./logger";

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

function storagePathFromUrl(url: string): string | null {
  if (!url.includes("firebasestorage.googleapis.com")) return null;
  try {
    const oIndex = url.indexOf("/o/");
    if (oIndex === -1) return null;
    const queryIndex = url.indexOf("?");
    const encodedPath = queryIndex === -1
      ? url.substring(oIndex + 3)
      : url.substring(oIndex + 3, queryIndex);
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

export async function cleanupOldChatsAndFiles(): Promise<void> {
  logger.info("Starting cleanup of old chat messages and shared documents...");
  const now = new Date();
  const fileCutoff = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  const chatCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const bucket = storageBucket();

  if (useFirestore()) {
    // Firestore-only mode
    const firestoreDb = getFirestore();
    
    // 1. Storage & Attachment Cleanup (older than 20 days)
    try {
      const snap = await firestoreDb.collection("messages")
        .where("createdAt", "<", fileCutoff.toISOString())
        .get();

      for (const doc of snap.docs) {
        const data = doc.data();
        const attachments = data.attachments as any[];
        if (attachments && attachments.length > 0) {
          logger.info({ msgId: doc.id }, "Cleaning up attachments for old message in Firestore");
          for (const att of attachments) {
            if (att.url) {
              const path = storagePathFromUrl(att.url);
              if (path) {
                try {
                  const file = bucket.file(path);
                  const [exists] = await file.exists();
                  if (exists) {
                    await file.delete();
                    logger.info({ path }, "Deleted file from Storage");
                  }
                } catch (err) {
                  logger.warn({ err, path }, "Failed to delete file from Storage");
                }
              }
            }
          }
          // Clear attachments field in Firestore
          await doc.ref.update({ attachments: null });
          const channelId = data.channelId;
          if (channelId) {
            await firestoreDb.collection("channels")
              .doc(String(channelId))
              .collection("messages")
              .doc(doc.id)
              .update({ attachments: null });
          }
        }
      }
    } catch (err) {
      logger.error({ err }, "Error cleaning up Firestore attachments");
    }

    // 2. Chat Message Deletion (older than 60 days)
    try {
      const snap = await firestoreDb.collection("messages")
        .where("createdAt", "<", chatCutoff.toISOString())
        .get();

      for (const doc of snap.docs) {
        const data = doc.data();
        const channelId = data.channelId;
        
        // Also delete any remaining attachments from GCS (just in case)
        const attachments = data.attachments as any[];
        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            if (att.url) {
              const path = storagePathFromUrl(att.url);
              if (path) {
                try {
                  const file = bucket.file(path);
                  const [exists] = await file.exists();
                  if (exists) await file.delete();
                } catch {}
              }
            }
          }
        }

        // Delete from root messages and channel messages
        await doc.ref.delete();
        if (channelId) {
          await firestoreDb.collection("channels")
            .doc(String(channelId))
            .collection("messages")
            .doc(doc.id)
            .delete();
        }
        logger.info({ msgId: doc.id }, "Deleted old message from Firestore");
      }
    } catch (err) {
      logger.error({ err }, "Error deleting old Firestore messages");
    }

  } else {
    // Postgres mode (+ optional Firestore mirror)
    const { db } = getPgDb();
    
    // 1. Storage & Attachment Cleanup (older than 20 days)
    try {
      const oldMessagesWithFiles = await db
        .select()
        .from(messagesTable)
        .where(
          and(
            lt(messagesTable.createdAt, fileCutoff),
            isNotNull(messagesTable.attachments),
          )
        );

      for (const msg of oldMessagesWithFiles) {
        const attachments = msg.attachments as any[];
        if (attachments && attachments.length > 0) {
          logger.info({ msgId: msg.id }, "Cleaning up attachments for old message in Postgres");
          for (const att of attachments) {
            if (att.url) {
              const path = storagePathFromUrl(att.url);
              if (path) {
                try {
                  const file = bucket.file(path);
                  const [exists] = await file.exists();
                  if (exists) {
                    await file.delete();
                    logger.info({ path }, "Deleted file from Storage");
                  }
                } catch (err) {
                  logger.warn({ err, path }, "Failed to delete file from Storage");
                }
              }
            }
          }

          // Clear in PG database
          await db
            .update(messagesTable)
            .set({ attachments: null })
            .where(eq(messagesTable.id, msg.id));

          // Clear in Firestore if mirrored
          try {
            const firestoreDb = getFirestore();
            if (firestoreDb) {
              await firestoreDb.collection("messages").doc(String(msg.id)).update({ attachments: null });
              await firestoreDb
                .collection("channels")
                .doc(String(msg.channelId))
                .collection("messages")
                .doc(String(msg.id))
                .update({ attachments: null });
            }
          } catch {
            // Mirroring disabled or not configured, ignore
          }
        }
      }
    } catch (err) {
      logger.error({ err }, "Error cleaning up Postgres attachments");
    }

    // 2. Chat Message Deletion (older than 60 days)
    try {
      const oldMessages = await db
        .select()
        .from(messagesTable)
        .where(lt(messagesTable.createdAt, chatCutoff));

      for (const msg of oldMessages) {
        // Double check attachments deletion in GCS
        const attachments = msg.attachments as any[];
        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            if (att.url) {
              const path = storagePathFromUrl(att.url);
              if (path) {
                try {
                  const file = bucket.file(path);
                  const [exists] = await file.exists();
                  if (exists) await file.delete();
                } catch {}
              }
            }
          }
        }

        // Delete from PG
        await db.delete(messagesTable).where(eq(messagesTable.id, msg.id));

        // Delete from Firestore mirror if exists
        try {
          const firestoreDb = getFirestore();
          if (firestoreDb) {
            await firestoreDb.collection("messages").doc(String(msg.id)).delete();
            await firestoreDb
              .collection("channels")
              .doc(String(msg.channelId))
              .collection("messages")
              .doc(String(msg.id))
              .delete();
          }
        } catch {
          // Mirroring disabled, ignore
        }
        logger.info({ msgId: msg.id }, "Deleted old message from Postgres");
      }
    } catch (err) {
      logger.error({ err }, "Error deleting old Postgres messages");
    }
  }

  logger.info("Cleanup of old chat messages and shared documents completed.");
}

export function startCleanupScheduler(): void {
  // Run cleanup on startup (delayed slightly to allow initializations)
  setTimeout(() => {
    void cleanupOldChatsAndFiles().catch((err) => {
      logger.error({ err }, "Initial database/storage cleanup failed");
    });
  }, 30_000);

  // Run cleanup every 24 hours
  setInterval(() => {
    void cleanupOldChatsAndFiles().catch((err) => {
      logger.error({ err }, "Scheduled database/storage cleanup failed");
    });
  }, 24 * 60 * 60 * 1000);
}
