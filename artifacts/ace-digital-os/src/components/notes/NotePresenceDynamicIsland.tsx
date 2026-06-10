import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, Loader2, Wifi } from "lucide-react";
import { useMemo } from "react";
import type { NotePresencePeer } from "@/hooks/use-note-awareness";
import type { YjsSyncStatus } from "@/hooks/use-yjs-firebase-sync";
import { fluidSpring, fluidSpringSoft } from "@/components/design/fluid-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export type NoteCollabPresenceState = {
  status: YjsSyncStatus;
  peers: NotePresencePeer[];
  error?: Error | null;
};

type IslandMode = "idle" | "sync" | "offline" | "error" | "typing" | "peers";

function resolveIslandMode(
  status: YjsSyncStatus,
  peers: NotePresencePeer[],
): IslandMode {
  if (peers.some((p) => p.typing)) return "typing";
  if (status === "loading" || status === "syncing") return "sync";
  if (status === "offline") return "offline";
  if (status === "error") return "error";
  if (peers.length > 0) return "peers";
  return "idle";
}

function resolveLabel(status: YjsSyncStatus, peers: NotePresencePeer[]): string {
  const typing = peers.filter((p) => p.typing);
  if (typing.length === 1) return `${firstName(typing[0]!.name)} is typing…`;
  if (typing.length > 1) {
    return `${firstName(typing[0]!.name)} and ${typing.length - 1} other${typing.length > 2 ? "s" : ""} are typing…`;
  }
  if (status === "loading") return "Connecting…";
  if (status === "syncing") return "Syncing…";
  if (status === "offline") return "Offline — saved locally";
  if (status === "error") return "Sync error";
  if (peers.length === 1) return `Editing with ${firstName(peers[0]!.name)}`;
  if (peers.length > 1) {
    return `Editing with ${peers.slice(0, 2).map((p) => firstName(p.name)).join(", ")}${peers.length > 2 ? ` +${peers.length - 2}` : ""}`;
  }
  return "Synced";
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function PeerDots({ peers, max = 3 }: { peers: NotePresencePeer[]; max?: number }) {
  const visible = peers.slice(0, max);
  return (
    <div className="flex -space-x-1.5 shrink-0">
      {visible.map((peer) => (
        <span
          key={peer.userId}
          className="note-island-avatar"
          style={{ backgroundColor: peer.color }}
          title={peer.name}
        >
          {peer.name.charAt(0).toUpperCase()}
        </span>
      ))}
    </div>
  );
}

interface NotePresenceDynamicIslandProps {
  status: YjsSyncStatus;
  peers: NotePresencePeer[];
  error?: Error | null;
  className?: string;
}

/**
 * Dynamic Island–style presence chip — morphs between sync state and live collaborators.
 */
export function NotePresenceDynamicIsland({
  status,
  peers,
  error,
  className,
}: NotePresenceDynamicIslandProps) {
  const reduced = useReducedMotion();
  const mode = useMemo(() => resolveIslandMode(status, peers), [status, peers]);
  const label = useMemo(() => resolveLabel(status, peers), [status, peers]);

  const expanded = mode !== "idle";
  const showPeers = mode === "peers" || mode === "typing";

  if (reduced) {
    if (!expanded) return null;
    return (
      <div className={cn("note-dynamic-island note-dynamic-island--expanded", className)}>
        <span className="note-dynamic-island__label">{label}</span>
      </div>
    );
  }

  return (
    <div className={cn("note-dynamic-island-wrap", className)}>
      <motion.div
        layout
        className={cn(
          "note-dynamic-island",
          `note-dynamic-island--${mode}`,
          expanded && "note-dynamic-island--expanded",
        )}
        initial={false}
        animate={{
          scale: expanded ? 1 : 0.92,
          opacity: mode === "idle" ? 0.55 : 1,
        }}
        transition={fluidSpringSoft}
        title={error?.message}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${mode}-${label}`}
            className="note-dynamic-island__inner"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={fluidSpring}
          >
            {mode === "sync" && (
              <Loader2 className="note-dynamic-island__icon animate-spin" aria-hidden />
            )}
            {mode === "offline" && (
              <CloudOff className="note-dynamic-island__icon" aria-hidden />
            )}
            {mode === "error" && (
              <CloudOff className="note-dynamic-island__icon text-destructive" aria-hidden />
            )}
            {mode === "idle" && (
              <Wifi className="note-dynamic-island__icon text-primary" aria-hidden />
            )}
            {showPeers && peers.length > 0 && <PeerDots peers={peers} />}
            <span className="note-dynamic-island__label">{expanded ? label : "Live"}</span>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
