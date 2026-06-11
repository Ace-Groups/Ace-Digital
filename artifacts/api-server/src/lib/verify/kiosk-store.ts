import type { KioskDevice } from "../credentials/types";
import { signKioskDeviceToken } from "../credentials/verification";
import { fs, useFirestore } from "../credentials/firestore-util";

const COL = "verify_kiosk_devices";
const memory = new Map<string, KioskDevice>();

function rowFromDoc(id: string, data: Record<string, unknown>): KioskDevice {
  return {
    id,
    name: data.name as string,
    deviceToken: data.deviceToken as string,
    webhookUrl: (data.webhookUrl as string | null) ?? null,
    actions: (data.actions as KioskDevice["actions"]) ?? ["log_attendance"],
    enabled: data.enabled !== false,
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
  };
}

export async function listKioskDevices(): Promise<KioskDevice[]> {
  if (useFirestore()) {
    const snap = await fs().collection(COL).get();
    return snap.docs.map((d) => rowFromDoc(d.id, d.data()));
  }
  return [...memory.values()];
}

export async function findKioskDevice(id: string): Promise<KioskDevice | null> {
  if (useFirestore()) {
    const doc = await fs().collection(COL).doc(id).get();
    if (!doc.exists) return null;
    return rowFromDoc(id, doc.data()!);
  }
  return memory.get(id) ?? null;
}

export async function createKioskDevice(input: {
  name: string;
  webhookUrl?: string | null;
  actions?: KioskDevice["actions"];
}): Promise<KioskDevice> {
  const id = `kiosk-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const row: KioskDevice = {
    id,
    name: input.name,
    deviceToken: signKioskDeviceToken(id),
    webhookUrl: input.webhookUrl ?? null,
    actions: input.actions ?? ["log_attendance"],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
  if (useFirestore()) {
    await fs().collection(COL).doc(id).set(row);
  } else {
    memory.set(id, row);
  }
  return row;
}

export async function updateKioskDevice(
  id: string,
  patch: Partial<Pick<KioskDevice, "name" | "webhookUrl" | "actions" | "enabled">>,
): Promise<KioskDevice | null> {
  const existing = await findKioskDevice(id);
  if (!existing) return null;
  const updated: KioskDevice = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (useFirestore()) {
    await fs().collection(COL).doc(id).set(updated);
  } else {
    memory.set(id, updated);
  }
  return updated;
}

export async function resolveKioskFromQuery(
  kioskParam: string | undefined,
): Promise<KioskDevice | null> {
  if (!kioskParam) return null;
  const devices = await listKioskDevices();
  return (
    devices.find((d) => d.enabled && d.deviceToken === kioskParam) ?? null
  );
}
