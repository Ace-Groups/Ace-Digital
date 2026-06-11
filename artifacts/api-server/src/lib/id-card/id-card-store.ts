import type { User } from "@workspace/db";
import { fs, useFirestore } from "../credentials/firestore-util";
import { normalizeEmployeeCode } from "../credentials/employee-code";

export type StoredIdCardAssets = {
  userId: number;
  employeeCode: string;
  variant: "employee" | "intern";
  frontPngUrl: string;
  backPngUrl: string;
  pdfUrl: string;
  verifyUrl: string;
  issuedAt: string;
  storagePrefix: string;
  templateVersion: string;
};

const COLLECTION = "employee_id_cards";
const memory = new Map<number, StoredIdCardAssets>();

function docId(userId: number): string {
  return String(userId);
}

export async function saveIdCardAssets(assets: StoredIdCardAssets): Promise<void> {
  memory.set(assets.userId, assets);
  if (!useFirestore()) return;
  await fs().collection(COLLECTION).doc(docId(assets.userId)).set(assets);
}

export async function getIdCardAssetsByUserId(userId: number): Promise<StoredIdCardAssets | null> {
  if (memory.has(userId)) return memory.get(userId)!;
  if (!useFirestore()) return null;
  const snap = await fs().collection(COLLECTION).doc(docId(userId)).get();
  if (!snap.exists) return null;
  const data = snap.data() as StoredIdCardAssets;
  memory.set(userId, data);
  return data;
}

export async function getIdCardAssetsByCode(code: string): Promise<StoredIdCardAssets | null> {
  const normalized = normalizeEmployeeCode(code);
  for (const assets of memory.values()) {
    if (normalizeEmployeeCode(assets.employeeCode) === normalized) return assets;
  }
  if (!useFirestore()) return null;
  const snap = await fs()
    .collection(COLLECTION)
    .where("employeeCode", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const data = snap.docs[0]!.data() as StoredIdCardAssets;
  memory.set(data.userId, data);
  return data;
}

export function buildPublicAssetApiUrl(
  employeeCode: string,
  fileName: "front.png" | "back.png" | "id-card.pdf",
): string {
  const base =
    process.env.API_PUBLIC_URL?.replace(/\/$/, "") ??
    process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, "") ??
    "https://ace-digital-api.onrender.com";
  return `${base}/api/v1/public/id-cards/${encodeURIComponent(normalizeEmployeeCode(employeeCode))}/${fileName}`;
}
