import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, Send, Sparkles, X } from "lucide-react";
import { AceAiAvatar } from "@/components/ai/AceAiAvatar";
import { AceAiHero } from "@/components/ai/AceAiHero";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAiConversation,
  getGetAiConversationQueryKey,
} from "@workspace/api-client-react";
import { GlassContainer } from "@/components/design/glass-container";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useAceAssistant,
  formatContextLabel,
} from "@/contexts/AceAssistantContext";
import { AiMessageContent } from "@/components/ai/AiMessageContent";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { streamAiChat } from "@/lib/ai-stream";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { getProactiveInsights } from "@/lib/ai-insights";


export function AceAssistantPanel() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    open,
    setOpen,
    pageContext,
    conversationId,
    setConversationId,
    pendingPrompt,
    consumePendingPrompt,
  } = useAceAssistant();
  const [input, setInput] = useState("");
  const [pendingUserMsg, setPendingUserMsg] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const quickPrompts = getProactiveInsights(pageContext);

  const convIdForQuery = conversationId ?? 0;
  const { data: conversation } = useGetAiConversation(convIdForQuery, {
    query: {
      queryKey: getGetAiConversationQueryKey(convIdForQuery),
      enabled: open && conversationId != null && conversationId > 0,
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, pendingUserMsg, isStreaming, streamingText]);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || isStreaming) return;
      hapticLight();
      setInput("");
      setPendingUserMsg(msg);
      setStreamingText("");
      setIsStreaming(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let finalConvId = conversationId ?? 0;
      let errored = false;

      try {
        await streamAiChat(
          {
            message: msg,
            conversationId: conversationId ?? undefined,
            pageContext,
          },
          (event) => {
            if (event.type === "start") {
              finalConvId = event.conversationId;
              setConversationId(event.conversationId);
            } else if (event.type === "chunk") {
              setStreamingText((prev) => prev + event.text);
            } else if (event.type === "done") {
              finalConvId = event.conversationId;
              setConversationId(event.conversationId);
              hapticSuccess();
            } else if (event.type === "error") {
              errored = true;
              toast({
                title: "Ace AI",
                description: event.error,
                variant: "destructive",
              });
            }
          },
          controller.signal,
        );

        // Wait for the persisted conversation before clearing optimistic UI,
        // so the reply doesn't flash empty between stream end and refetch.
        if (!errored && finalConvId > 0) {
          await queryClient.refetchQueries({
            queryKey: getGetAiConversationQueryKey(finalConvId),
          });
        }
      } catch {
        toast({
          title: "Ace AI",
          description: "Something went wrong sending your message.",
          variant: "destructive",
        });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setPendingUserMsg(null);
        setStreamingText("");
        setIsStreaming(false);
      }
    },
    [input, isStreaming, conversationId, pageContext, toast, queryClient, setConversationId],
  );

  // Consume a queued prompt (e.g. from a suggestion chip elsewhere) once open.
  useEffect(() => {
    if (open && pendingPrompt && !isStreaming) {
      const prompt = pendingPrompt;
      consumePendingPrompt();
      void handleSend(prompt);
    }
  }, [open, pendingPrompt, isStreaming, consumePendingPrompt, handleSend]);

  // Abort any in-flight stream when the panel closes.
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  function handleNewChat() {
    abortRef.current?.abort();
    setConversationId(null);
    setInput("");
    setPendingUserMsg(null);
    setStreamingText("");
    setIsStreaming(false);
  }

  const contextLabel = formatContextLabel(pageContext);
  const messages = conversation?.messages ?? [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <motion.aside
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed z-50 flex flex-col border-l border-border/40 bg-card/95 shadow-v2-xl backdrop-blur-2xl",
              isMobile ? "inset-0" : "right-0 top-0 h-full w-full max-w-md",
            )}
          >
            <GlassContainer variant="header" className="flex shrink-0 items-center gap-2 rounded-none border-b border-border/50 px-4 py-3">
              <AceAiAvatar size="md" withRing />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Ask Ace</p>
                {contextLabel && (
                  <p className="truncate text-[11px] text-muted-foreground">{contextLabel}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNewChat}
                aria-label="New conversation"
              >
                <Plus size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
              >
                <X size={16} />
              </Button>
            </GlassContainer>

            <ScrollArea className="flex-1 px-4 py-3">
              {messages.length === 0 && !pendingUserMsg && (
                <div className="mb-4 space-y-4">
                  <AceAiHero className="max-w-[220px]" />
                  <p className="text-sm text-muted-foreground">
                    I can query projects, tasks, finance, tickets, calendar, notes, and more —
                    scoped to your permissions.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSend(p)}
                        className="v2-chip hover:bg-primary/10 hover:text-primary"
                      >
                        <Sparkles size={12} className="text-primary" />
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pb-4">
                {messages.map((m) =>
                  m.role === "assistant" ? (
                    <div key={m.id} className="flex gap-2 mr-2">
                      <AceAiAvatar size="sm" className="mt-0.5" />
                      <div className="min-w-0 flex-1 rounded-xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {m.content && m.metadata?.layout !== "service_error" && (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                        <AiMessageContent
                          body={m.content}
                          metadata={m.metadata}
                          conversationId={conversationId ?? undefined}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      key={m.id}
                      className="ml-8 rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                    >
                      {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                    </div>
                  ),
                )}
                {pendingUserMsg && (
                  <div className="ml-8 rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {pendingUserMsg}
                  </div>
                )}
                {isStreaming && (
                  <div className="flex gap-2 mr-2">
                    <AceAiAvatar size="sm" className="mt-0.5" />
                    <div className="min-w-0 flex-1 rounded-xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                      {streamingText ? (
                        <p className="whitespace-pre-wrap">{streamingText}</p>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 size={14} className="animate-spin" />
                          Ace is thinking…
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t border-border/50 p-3">
              {messages.length > 0 && !isStreaming && quickPrompts.length > 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border">
                  {quickPrompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSend(p)}
                      className="v2-chip shrink-0 whitespace-nowrap hover:bg-primary/10 hover:text-primary"
                    >
                      <Sparkles size={12} className="text-primary" />
                      {p}
                    </button>
                  ))}
                </div>
              )}
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Ask anything about your workspace…"
                  className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                  disabled={!input.trim() || isStreaming}
                  aria-label="Send"
                >
                  <Send size={16} />
                </Button>
              </form>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                ⌘/Ctrl + . to toggle · Data access follows your role
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
