import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import {
  cropImageToDataUrl,
  PROFILE_PHOTO_ASPECT,
  PROFILE_PHOTO_OUTPUT_SIZE,
} from "@/lib/image-crop";

type ImageCropDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  title?: string;
  onComplete: (dataUrl: string) => void;
};

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  title = "Adjust profile photo",
  onComplete,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleApply() {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const dataUrl = await cropImageToDataUrl(
        imageSrc,
        croppedAreaPixels,
        PROFILE_PHOTO_OUTPUT_SIZE,
      );
      onComplete(dataUrl);
      onOpenChange(false);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-4 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Drag to reposition and pinch or slide to zoom. Center the face in the frame.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[min(58vw,320px)] w-full bg-muted">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={PROFILE_PHOTO_ASPECT}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : null}
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Zoom</Label>
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={(values) => setZoom(values[0] ?? 1)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleApply()} disabled={saving || !croppedAreaPixels}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Use photo"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
