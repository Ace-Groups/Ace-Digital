import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  toggleMessageReaction,
  useDeleteMessage,
  useVotePoll,
  useRsvpEvent,
  type Message,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  applyChannelMessageUpdate,
  markMessageDeletedOptimistic,
  rsvpEventMetadata,
  rollbackChannelMessagesDual,
  snapshotChannelMessages,
  toggleReactionMetadata,
  votePollMetadata,
  type PatchMessageFn,
} from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";

export function useChannelMessageOptimistic(
  channelId: number | null,
  patchMessage?: PatchMessageFn,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteMutation = useDeleteMessage();
  const votePoll = useVotePoll();
  const rsvpEvent = useRsvpEvent();

  const apply = useCallback(
    (messageId: number, updater: (m: Message) => Message) => {
      if (!channelId) return;
      applyChannelMessageUpdate(channelId, messageId, updater, {
        queryClient,
        patchMessage,
      });
    },
    [channelId, queryClient, patchMessage],
  );

  const snapshot = useCallback(() => {
    if (!channelId) return undefined;
    return snapshotChannelMessages(queryClient, channelId);
  }, [channelId, queryClient]);

  const rollback = useCallback(
    (prev: Message[] | undefined) => {
      if (!channelId) return;
      rollbackChannelMessagesDual(queryClient, channelId, prev, patchMessage);
    },
    [channelId, queryClient, patchMessage],
  );

  const toggleReactionInstant = useCallback(
    (msg: Message, emoji: string, userId: number) => {
      if (!channelId) return;
      void runOptimistic({
        apply: () => {
          const prev = snapshot();
          apply(msg.id, (m) => toggleReactionMetadata(m, userId, emoji));
          return prev;
        },
        rollback,
        commit: () => toggleMessageReaction(channelId, msg.id, { emoji }),
        reconcile: (updated) => apply(msg.id, () => updated),
      }).catch(() => {
        toast({ title: "Could not update reaction", variant: "destructive" });
      });
    },
    [channelId, apply, snapshot, rollback, toast],
  );

  const deleteMessage = useCallback(
    async (msg: Message) => {
      if (!channelId) return;
      return runOptimistic({
        apply: () => {
          const prev = snapshot();
          apply(msg.id, markMessageDeletedOptimistic);
          return prev;
        },
        rollback,
        commit: () =>
          deleteMutation.mutateAsync({ id: channelId, messageId: msg.id }),
        reconcile: (updated) => apply(msg.id, () => updated),
      }).catch(() => {
        toast({ title: "Could not delete message", variant: "destructive" });
      });
    },
    [channelId, snapshot, rollback, apply, deleteMutation, toast],
  );

  const votePollInstant = useCallback(
    (msg: Message, optionId: string, userId: number) => {
      if (!channelId) return;
      void runOptimistic({
        apply: () => {
          const prev = snapshot();
          apply(msg.id, (m) => votePollMetadata(m, userId, optionId));
          return prev;
        },
        rollback,
        commit: () =>
          votePoll.mutateAsync({
            id: channelId,
            messageId: msg.id,
            data: { optionId },
          }),
        reconcile: (updated) => apply(msg.id, () => updated),
      }).catch(() => {
        toast({ title: "Could not record vote", variant: "destructive" });
      });
    },
    [channelId, apply, snapshot, rollback, votePoll, toast],
  );

  const rsvpInstant = useCallback(
    (msg: Message, status: "going" | "maybe" | "no", userId: number) => {
      if (!channelId) return;
      void runOptimistic({
        apply: () => {
          const prev = snapshot();
          apply(msg.id, (m) => rsvpEventMetadata(m, userId, status));
          return prev;
        },
        rollback,
        commit: () =>
          rsvpEvent.mutateAsync({
            id: channelId,
            messageId: msg.id,
            data: { status },
          }),
        reconcile: (updated) => apply(msg.id, () => updated),
      }).catch(() => {
        toast({ title: "Could not update RSVP", variant: "destructive" });
      });
    },
    [channelId, apply, snapshot, rollback, rsvpEvent, toast],
  );

  return {
    toggleReactionInstant,
    deleteMessage,
    votePollInstant,
    rsvpInstant,
    apply,
  };
}
