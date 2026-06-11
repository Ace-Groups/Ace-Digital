import type { User } from "@workspace/db";
import { ensureFirebaseAdminApp } from "@workspace/db";
import { getStorage } from "firebase-admin/storage";
import { svgToPngBytes, idCardPairToPdf } from "../credentials/pdf-from-svg";
import { buildVerifyUrl, getOrgCredentialSettings } from "../credentials/org-settings";
import { employeeCodeFromUser } from "../credentials/employee-code";
import { prepareIdCardPair } from "./prepare-id-card";
import {
  buildPublicAssetApiUrl,
  getIdCardAssetsByUserId,
  saveIdCardAssets,
  type StoredIdCardAssets,
} from "./id-card-store";
import { logger } from "../logger";

const CARD_RENDER_WIDTH = 540;

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

async function uploadPublicFile(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
    return null;
  }
  try {
    const bucket = storageBucket();
    const file = bucket.file(path);
    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    try {
      await file.makePublic();
    } catch {
      /* uniform bucket access may already allow public reads via rules */
    }
    return `https://storage.googleapis.com/${bucket.name}/${path}`;
  } catch (err) {
    logger.warn({ err, path }, "ID card cloud upload failed");
    return null;
  }
}

export type PublishIdCardResult = {
  pair: Awaited<ReturnType<typeof prepareIdCardPair>>;
  assets: StoredIdCardAssets;
  pdfBytes: Uint8Array;
};

export async function publishIdCardForUser(
  user: User,
  extras?: {
    teamName?: string | null;
    university?: string | null;
    program?: string | null;
    mentorName?: string | null;
    endDate?: string | null;
  },
): Promise<PublishIdCardResult> {
  const pair = await prepareIdCardPair(user, extras);
  const employeeCode = employeeCodeFromUser(user);
  const org = await getOrgCredentialSettings();
  const verifyUrl = buildVerifyUrl(org.verifyBaseUrl, employeeCode);
  const prefix = `id-cards/${employeeCode}`;
  const issuedAt = new Date().toISOString();

  const [frontPng, backPng, pdfBytes] = await Promise.all([
    svgToPngBytes(pair.frontSvg, CARD_RENDER_WIDTH),
    svgToPngBytes(pair.backSvg, CARD_RENDER_WIDTH),
    idCardPairToPdf(pair.frontSvg, pair.backSvg),
  ]);

  const [cloudFront, cloudBack, cloudPdf] = await Promise.all([
    uploadPublicFile(`${prefix}/front.png`, Buffer.from(frontPng), "image/png"),
    uploadPublicFile(`${prefix}/back.png`, Buffer.from(backPng), "image/png"),
    uploadPublicFile(`${prefix}/id-card.pdf`, Buffer.from(pdfBytes), "application/pdf"),
  ]);

  const assets: StoredIdCardAssets = {
    userId: user.id,
    employeeCode,
    variant: pair.variant,
    frontPngUrl: cloudFront ?? buildPublicAssetApiUrl(employeeCode, "front.png"),
    backPngUrl: cloudBack ?? buildPublicAssetApiUrl(employeeCode, "back.png"),
    pdfUrl: cloudPdf ?? buildPublicAssetApiUrl(employeeCode, "id-card.pdf"),
    verifyUrl,
    issuedAt,
    storagePrefix: prefix,
  };

  await saveIdCardAssets(assets);
  return { pair, assets, pdfBytes };
}

export async function getOrPublishIdCardAssets(
  user: User,
  extras?: Parameters<typeof publishIdCardForUser>[1],
  force = false,
): Promise<PublishIdCardResult> {
  if (!force) {
    const existing = await getIdCardAssetsByUserId(user.id);
    if (existing) {
      const pair = await prepareIdCardPair(user, extras);
      const pdfBytes = await idCardPairToPdf(pair.frontSvg, pair.backSvg);
      return { pair, assets: existing, pdfBytes };
    }
  }
  return publishIdCardForUser(user, extras);
}
