import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let cachedLogoDataUrl: string | null = null;

/** Embedded Ace Digital logo for reliable SVG/PDF rendering (no network fetch). */
export function aceLogoDataUrl(): string {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  const base = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(base, "../../assets/ace-logo.png"),
    join(base, "../../../assets/ace-logo.png"),
  ];
  for (const path of candidates) {
    try {
      const buf = readFileSync(path);
      cachedLogoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
      return cachedLogoDataUrl;
    } catch {
      /* try next */
    }
  }
  cachedLogoDataUrl =
    "https://ace-digital-os.web.app/ace-logo.png";
  return cachedLogoDataUrl;
}
