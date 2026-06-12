function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

async function fetchVcardText(vcardUrl: string): Promise<string> {
  const res = await fetch(vcardUrl, { credentials: "same-origin" });
  if (!res.ok) {
    throw new Error("Could not load contact file");
  }
  return res.text();
}

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}

async function shareVcardFile(text: string, filename: string): Promise<boolean> {
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
    return false;
  }
  const safeName = filename.endsWith(".vcf") ? filename : `${filename}.vcf`;
  const file = new File([text], safeName, { type: "text/vcard" });
  if (!navigator.canShare({ files: [file] })) return false;
  await navigator.share({ files: [file], title: "Add to Contacts" });
  return true;
}

/**
 * Opens the native contact-import flow on mobile and downloads on desktop.
 * iOS Safari: navigate to the hosted .vcf URL (opens Add to Contacts).
 * Android Chrome: Web Share with the vCard file, then direct .vcf navigation.
 */
export async function saveContactVcard(vcardUrl: string, filename: string): Promise<void> {
  const safeName = filename.endsWith(".vcf") ? filename : `${filename}.vcf`;

  if (isIos()) {
    window.location.assign(vcardUrl);
    return;
  }

  if (isAndroid()) {
    try {
      const text = await fetchVcardText(vcardUrl);
      try {
        const shared = await shareVcardFile(text, safeName);
        if (shared) return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
      window.location.assign(vcardUrl);
      return;
    } catch {
      window.location.assign(vcardUrl);
      return;
    }
  }

  const text = await fetchVcardText(vcardUrl);
  const blob = new Blob([text], { type: "text/vcard;charset=utf-8" });
  downloadBlob(blob, safeName);
}
