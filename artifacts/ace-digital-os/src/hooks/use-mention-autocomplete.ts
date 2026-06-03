import { useCallback, useEffect, useState } from "react";
import { getChannelMentionCandidates } from "@workspace/api-client-react";
import { mentionQueryAtCursor } from "@/lib/chat-mentions";

export type MentionCandidate = {
  userId: number;
  fullName: string;
  avatarUrl?: string | null;
};

export function useMentionAutocomplete(channelId: number, body: string, cursor: number) {
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const query = mentionQueryAtCursor(body, cursor);
  const open = query !== null;

  useEffect(() => {
    if (!open || !channelId) {
      setCandidates([]);
      setActiveIndex(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getChannelMentionCandidates(channelId, { q: query })
      .then((list) => {
        if (!cancelled) {
          setCandidates(list);
          setActiveIndex(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, query, open]);

  const moveActive = useCallback(
    (delta: number) => {
      if (!candidates.length) return;
      setActiveIndex((i) => (i + delta + candidates.length) % candidates.length);
    },
    [candidates.length],
  );

  return {
    open,
    query,
    candidates,
    loading,
    activeIndex,
    setActiveIndex,
    moveActive,
  };
}
