import { useState } from "react";
import { Camera, Crop, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FilePickControl } from "@/components/ui/file-pick-control";
import { ImageCropDialog } from "@/components/employees/ImageCropDialog";
import { EmployeeProfilePhoto } from "@/components/employees/EmployeeProfilePhoto";
import { readFileAsDataUrl } from "@/lib/image-crop";
import { MAX_PROFILE_PHOTO_BYTES } from "@/lib/employee-documents";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ProfilePhotoUploadProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  altName?: string;
  hint?: string;
};

const fieldShell =
  "w-full rounded-xl border border-input/80 bg-background/60 shadow-v2-xs transition-colors hover:border-primary/40";

export function ProfilePhotoUpload({
  value,
  onChange,
  label = "Employee photo",
  altName = "Profile",
  hint = "Square headshot with the face centered. Used on employee cards, profiles, and ID cards.",
}: ProfilePhotoUploadProps) {
  const { toast } = useToast();
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);

  async function openCropper(file: File) {
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      toast({
        title: "Photo too large",
        description: "Use an image under 2.5 MB.",
        variant: "destructive",
      });
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCropSource(dataUrl);
      setCropOpen(true);
    } catch {
      toast({
        title: "Could not read photo",
        description: "Try a different image format.",
        variant: "destructive",
      });
    }
  }

  function openAdjust() {
    if (!value) return;
    setCropSource(value);
    setCropOpen(true);
  }

  return (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>

        {value ? (
          <div className="flex items-start gap-3">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-muted shadow-brand-sm sm:h-28 sm:w-28">
              <EmployeeProfilePhoto src={value} alt={`${altName} profile`} rounded="2xl" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">Photo added</p>
              <p className="text-xs text-muted-foreground">
                Face-centered square crop used across the employee directory and ID card.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openAdjust}>
                  <Crop size={14} />
                  Adjust crop
                </Button>
                <FilePickControl
                  accept="image/*"
                  onFile={(file) => void openCropper(file)}
                  aria-label="Replace profile photo"
                  className="inline-flex"
                >
                  <span className="inline-flex h-8 items-center rounded-lg border border-input/80 bg-background px-3 text-xs font-medium shadow-v2-xs">
                    Replace
                  </span>
                </FilePickControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => onChange("")}
                >
                  <Trash2 size={14} />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <FilePickControl
            accept="image/*"
            onFile={(file) => void openCropper(file)}
            aria-label="Choose profile photo"
            className="block w-full"
          >
            <div
              className={cn(
                fieldShell,
                "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 border-dashed bg-muted/20 px-4 py-4 text-muted-foreground hover:bg-muted/35 sm:min-h-20",
              )}
            >
              <Camera size={20} strokeWidth={1.75} />
              <span className="text-sm font-medium">Tap to add photo</span>
            </div>
          </FilePickControl>
        )}

        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageSrc={cropSource}
        onComplete={onChange}
      />
    </>
  );
}
