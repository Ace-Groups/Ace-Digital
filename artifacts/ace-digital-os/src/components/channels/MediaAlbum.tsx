import { useState } from "react";
import type { MessageAttachment } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface MediaAlbumProps {
  attachments: MessageAttachment[];
  isMe?: boolean;
}

export function MediaAlbum({ attachments, isMe }: MediaAlbumProps) {
  const media = attachments.filter((a) => a.type === "image" || a.type === "video");
  if (!media.length) return null;

  const [lightbox, setLightbox] = useState<number | null>(null);

  if (media.length === 1) {
    const att = media[0]!;
    return (
      <>
        <MediaTile att={att} isMe={isMe} onClick={() => setLightbox(0)} className="max-w-sm" />
        <Lightbox items={media} index={lightbox} onClose={() => setLightbox(null)} />
      </>
    );
  }

  const gridClass =
    media.length === 2
      ? "grid-cols-2"
      : media.length === 3
        ? "grid-cols-2 grid-rows-2 [&>*:first-child]:row-span-2"
        : "grid-cols-2 grid-rows-2";

  const visible = media.slice(0, 4);
  const extra = media.length - 4;

  return (
    <>
      <div className={cn("grid max-w-sm gap-0.5 overflow-hidden rounded-2xl", gridClass)}>
        {visible.map((att, i) => (
          <button
            key={`${att.url}-${i}`}
            type="button"
            className="relative aspect-square overflow-hidden bg-muted"
            onClick={() => setLightbox(i)}
          >
            <MediaThumb att={att} className="h-full w-full object-cover" />
            {extra > 0 && i === 3 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                +{extra}
              </span>
            )}
          </button>
        ))}
      </div>
      <Lightbox items={media} index={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}

function MediaTile({
  att,
  isMe,
  onClick,
  className,
}: {
  att: MessageAttachment;
  isMe?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block overflow-hidden rounded-2xl border",
        isMe ? "border-primary/30" : "border-border",
        className,
      )}
    >
      <MediaThumb att={att} className="max-h-72 w-full object-cover" />
    </button>
  );
}

function MediaThumb({ att, className }: { att: MessageAttachment; className?: string }) {
  if (att.type === "video") {
    return (
      <video
        src={att.url}
        className={className}
        muted
        playsInline
        preload="metadata"
      />
    );
  }
  return (
    <img
      src={att.thumbUrl ?? att.url}
      alt={att.name ?? ""}
      className={className}
      loading="lazy"
    />
  );
}

function Lightbox({
  items,
  index,
  onClose,
}: {
  items: MessageAttachment[];
  index: number | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={index !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl border-0 bg-black/95 p-2 sm:p-4">
        <DialogTitle className="sr-only">Media preview</DialogTitle>
        <DialogDescription className="sr-only">Swipe through attached photos and videos</DialogDescription>
        {index !== null && (
          <Carousel opts={{ startIndex: index }} className="w-full">
            <CarouselContent>
              {items.map((att, i) => (
                <CarouselItem key={`lb-${i}`}>
                  {att.type === "video" ? (
                    <video
                      src={att.url}
                      controls
                      playsInline
                      className="mx-auto max-h-[80vh] w-full"
                    />
                  ) : (
                    <img
                      src={att.url}
                      alt=""
                      className="mx-auto max-h-[80vh] w-full object-contain"
                    />
                  )}
                </CarouselItem>
              ))}
            </CarouselContent>
            {items.length > 1 && (
              <>
                <CarouselPrevious className="left-2 border-white/20 bg-black/50 text-white" />
                <CarouselNext className="right-2 border-white/20 bg-black/50 text-white" />
              </>
            )}
          </Carousel>
        )}
      </DialogContent>
    </Dialog>
  );
}
