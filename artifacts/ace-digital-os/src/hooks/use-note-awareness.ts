import { useEffect, useState } from "react";
import type { Awareness } from "y-protocols/awareness";

export type NotePresencePeer = {
  userId: number;
  name: string;
  color: string;
  typing: boolean;
};

type AwarenessUser = {
  userId?: number;
  name?: string;
  color?: string;
};

/** Remote collaborators derived from Yjs awareness (excludes local client). */
export function useNoteAwareness(
  awareness: Awareness | null,
  localUserId: number,
): NotePresencePeer[] {
  const [peers, setPeers] = useState<NotePresencePeer[]>([]);

  useEffect(() => {
    if (!awareness) {
      setPeers([]);
      return;
    }

    const refresh = () => {
      const byUser = new Map<number, NotePresencePeer>();

      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;

        const user = state.user as AwarenessUser | undefined;
        if (!user?.userId || !user.name) return;
        if (user.userId === localUserId) return;

        const typing = Boolean(state.typing);
        const existing = byUser.get(user.userId);

        if (!existing) {
          byUser.set(user.userId, {
            userId: user.userId,
            name: user.name,
            color: user.color ?? "#00e5cc",
            typing,
          });
        } else if (typing) {
          byUser.set(user.userId, { ...existing, typing: true });
        }
      });

      setPeers(Array.from(byUser.values()));
    };

    awareness.on("update", refresh);
    refresh();

    return () => {
      awareness.off("update", refresh);
    };
  }, [awareness, localUserId]);

  return peers;
}
