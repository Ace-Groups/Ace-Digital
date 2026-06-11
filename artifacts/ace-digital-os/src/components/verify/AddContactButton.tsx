import { useState } from "react";
import { Loader2, UserPlus, Check } from "lucide-react";
import { saveContactVcard } from "@/lib/vcard-download";

type AddContactButtonProps = {
  vcardUrl: string;
  filename: string;
  label?: string;
  className?: string;
};

export function AddContactButton({
  vcardUrl,
  filename,
  label = "Add to Contacts",
  className,
}: AddContactButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleClick() {
    if (state === "loading") return;
    setState("loading");
    try {
      await saveContactVcard(vcardUrl, filename);
      setState("done");
      window.setTimeout(() => setState("idle"), 2400);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2800);
    }
  }

  const icon =
    state === "loading" ? (
      <Loader2 className="verify-contact-btn-icon verify-contact-btn-icon--spin" />
    ) : state === "done" ? (
      <Check className="verify-contact-btn-icon" />
    ) : (
      <UserPlus className="verify-contact-btn-icon" />
    );

  const text =
    state === "loading"
      ? "Opening contacts…"
      : state === "done"
        ? "Contact ready"
        : state === "error"
          ? "Tap to try again"
          : label;

  return (
    <button
      type="button"
      className={className ?? "verify-contact-btn"}
      onClick={() => void handleClick()}
      disabled={state === "loading"}
      aria-busy={state === "loading"}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}
