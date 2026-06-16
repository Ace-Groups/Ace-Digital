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
      <div>{children}</div>
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
          if (!list?.length) return;
          const filesArray = Array.from(list);
          event.currentTarget.value = "";
          if (multiple && onFiles) {
            onFiles(filesArray);
            return;
          }
          const file = filesArray[0];
          if (file) onFile?.(file);
        }}
      />
    </div>
  );
}
