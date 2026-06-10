/** Neon-complement palette for collaborator cursors (distinct from primary cyan). */
const COLLABORATOR_COLORS = [
  "#ff6b9d",
  "#c084fc",
  "#fbbf24",
  "#34d399",
  "#fb923c",
  "#60a5fa",
  "#f472b6",
  "#a3e635",
] as const;

/** Deterministic accent color per user id. */
export function getCollaboratorColor(userId: number): string {
  const index = Math.abs(userId) % COLLABORATOR_COLORS.length;
  return COLLABORATOR_COLORS[index]!;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Returns true when the Y.Xml fragment has no meaningful content yet. */
export function isYFragmentEmpty(fragment: { length: number }): boolean {
  return fragment.length === 0;
}
