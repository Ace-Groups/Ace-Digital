/**
 * Save a vCard to the device contacts. Works across iOS Safari, Android Chrome, and desktop.
 */
export async function saveContactVcard(vcardUrl: string, filename: string): Promise<void> {
  const res = await fetch(vcardUrl);
  if (!res.ok) {
    throw new Error("Could not load contact file");
  }

  const text = await res.text();
  const safeName = filename.endsWith(".vcf") ? filename : `${filename}.vcf`;
  const blob = new Blob([text], { type: "text/vcard;charset=utf-8" });
  const file = new File([blob], safeName, { type: "text/vcard" });

  if (typeof navigator.share === "function" && typeof navigator.canShare === "function") {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Add contact" });
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safeName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // iOS Safari often ignores programmatic download — open the vCard inline instead.
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIos) {
    window.location.assign(
      `data:text/vcard;charset=utf-8,${encodeURIComponent(text)}`,
    );
    return;
  }

  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}
