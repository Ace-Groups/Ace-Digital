import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FilePickControl } from "@/components/ui/file-pick-control";
import { resizeImageFile } from "@/lib/avatar";
import { MAX_PROFILE_PHOTO_BYTES } from "@/lib/employee-documents";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ProfilePhotoUploadProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  altName?: string;
  hint?: string;
  maxDimension?: number;
};

export function ProfilePhotoUpload({
  value,
  onChange,
  label = "Employee photo",
  altName = "Profile",
  hint = "Stored compressed in the profile record. Use clear headshot-style photos under 2.5 MB.",
  maxDimension = 640,
}: ProfilePhotoUploadProps) {
  const { toast } = useToast();

  async function handleFile(file: File) {
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      toast({
        title: "Photo too large",
        description: "Use an image under 2.5 MB.",
        variant: "destructive",
      });
      return;
    }
    try {
      const url = await resizeImageFile(file, maxDimension);
      onChange(url);
    } catch {
      toast({
        title: "Could not read photo",
        description: "Try a different image format.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-center">
      <FilePickControl
        accept="image/*"
        onFile={(file) => void handleFile(file)}
        aria-label="Choose profile photo"
        className="mx-auto aspect-[4/5] w-36 sm:mx-0 sm:w-full"
      >
        <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-brand-sm transition-colors hover:border-primary/40">
          {value ? (
            <img src={value} alt={`${altName} profile`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
              <Camera size={26} />
              <span className="text-xs font-medium">Tap to add photo</span>
            </div>
          )}
          <div className="absolute inset-2 rounded-xl ring-1 ring-background/80" />
        </div>
      </FilePickControl>

      <div className="space-y-3">
        <Label>{label}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <FilePickControl
            accept="image/*"
            onFile={(file) => void handleFile(file)}
            aria-label="Choose profile photo"
            className="inline-flex"
          >
            <span className={cn(buttonVariants({ variant: "outline" }), "min-h-10 gap-2")}>
              <ImagePlus size={16} />
              Choose photo
            </span>
          </FilePickControl>
          {value ? (
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "min-h-10 gap-2 text-destructive hover:text-destructive",
              )}
              onClick={() => onChange("")}
            >
              <Trash2 size={16} />
              Remove
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
