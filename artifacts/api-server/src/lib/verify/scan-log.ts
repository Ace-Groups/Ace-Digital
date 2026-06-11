import { fs, useFirestore } from "../credentials/firestore-util";
import { hashIp } from "../credentials/verification";

const COL = "verify_scan_events";
const memory: ScanEvent[] = [];
const MAX_MEMORY = 5000;

export type ScanContext = "public" | "kiosk" | "security_app";

export type ScanEvent = {
  id: string;
  slug: string;
  userId: number;
  scannedAt: string;
  context: ScanContext;
  deviceId: string | null;
  ipHash: string | null;
};

export async function logVerifyScan(input: {
  slug: string;
  userId: number;
  context: ScanContext;
  deviceId?: string | null;
  ip?: string;
}): Promise<void> {
  const row: ScanEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    slug: input.slug,
    userId: input.userId,
    scannedAt: new Date().toISOString(),
    context: input.context,
    deviceId: input.deviceId ?? null,
    ipHash: hashIp(input.ip),
  };
  if (useFirestore()) {
    await fs().collection(COL).doc(row.id).set(row);
    return;
  }
  memory.unshift(row);
  if (memory.length > MAX_MEMORY) memory.pop();
}

export async function listRecentScansForUser(userId: number, limit = 20): Promise<ScanEvent[]> {
  if (useFirestore()) {
    const snap = await fs()
      .collection(COL)
      .where("userId", "==", userId)
      .orderBy("scannedAt", "desc")
      .limit(limit)
      .get()
      .catch(async () => {
        const all = await fs().collection(COL).where("userId", "==", userId).get();
        return all;
      });
    return snap.docs
      .map((d) => d.data() as ScanEvent)
      .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt))
      .slice(0, limit);
  }
  return memory.filter((e) => e.userId === userId).slice(0, limit);
}
