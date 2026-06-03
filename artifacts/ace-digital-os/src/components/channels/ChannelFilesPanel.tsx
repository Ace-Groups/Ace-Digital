import { useMemo, useState } from "react";
import {
  useListChannelFiles,
  getListChannelFilesQueryKey,
  type ChannelFile,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime } from "@/lib/utils";
import { formatFileSize } from "@/lib/chat-media";
import { Download, FileText, Image, Music, Video } from "lucide-react";

type FileFilter = "all" | "image" | "file" | "video" | "audio";

interface ChannelFilesPanelProps {
  channelId: number;
}

function FileIcon({ type }: { type: string }) {
  if (type === "image") return <Image size={18} />;
  if (type === "video") return <Video size={18} />;
  if (type === "audio") return <Music size={18} />;
  return <FileText size={18} />;
}

export function ChannelFilesPanel({ channelId }: ChannelFilesPanelProps) {
  const [filter, setFilter] = useState<FileFilter>("all");
  const queryType = filter === "all" ? undefined : filter;
  const params = { limit: 100, type: queryType };
  const { data, isPending } = useListChannelFiles(channelId, params, {
    query: {
      queryKey: getListChannelFilesQueryKey(channelId, params),
      enabled: channelId > 0,
    },
  });

  const files = useMemo(() => data ?? [], [data]);

  const filters: { id: FileFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "image", label: "Images" },
    { id: "file", label: "Docs" },
    { id: "audio", label: "Audio" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 gap-2 border-b border-border px-4 py-2">
        {filters.map((f) => (
          <Button
            key={f.id}
            type="button"
            size="sm"
            variant={filter === f.id ? "secondary" : "ghost"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {isPending ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !files.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No files shared yet</p>
        ) : (
          <ul className="space-y-2">
            {files.map((f: ChannelFile) => (
              <li
                key={`${f.messageId}-${f.url}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/40"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileIcon type={f.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name ?? f.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.uploaderName} · {formatRelativeTime(f.createdAt)}
                    {f.size ? ` · ${formatFileSize(f.size)}` : ""}
                  </p>
                </div>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted",
                  )}
                  aria-label="Download"
                >
                  <Download size={16} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
