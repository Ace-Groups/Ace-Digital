import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FilePickControlProps = {
  accept: string;
  onFile?: (file: File) => void;
  onFiles?: (files: File[]) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  "aria-label"?: string;
};

/**
 * Reliable file picker for use inside dialogs/sheets.
 * Uses a transparent input overlay so the browser opens the native picker
 * from a real user click (programmatic input.click() is often blocked in modals).
 */
export function FilePickControl({
  accept,
  onFile,
  onFiles,
  children,
  className,
  disabled,
  multiple,
  "aria-label": ariaLabel = "Choose file",
}: FilePickControlProps) {
  const inputId = useId();

  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none">{children}</div>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={ariaLabel}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        onChange={(event) => {
          const list = event.target.files;
          event.currentTarget.value = "";
          if (!list?.length) return;
          if (multiple && onFiles) {
            onFiles(Array.from(list));
            return;
          }
          const file = list[0];
          if (file) onFile?.(file);
        }}
      />
    </div>
  );
}
