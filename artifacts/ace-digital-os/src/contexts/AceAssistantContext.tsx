import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import type { AiPageContext } from "@workspace/api-client-react";

type AceAssistantContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  pageContext: AiPageContext;
  conversationId: number | null;
  setConversationId: (id: number | null) => void;
  /** A prompt queued for the panel to send once it mounts/opens. */
  pendingPrompt: string | null;
  /** Clear the queued prompt after the panel consumes it. */
  consumePendingPrompt: () => void;
  /** Open the panel in a fresh conversation and queue a prompt to send. */
  openWithPrompt: (prompt: string) => void;
};

export type { AceAssistantContextValue };

const AceAssistantContext = createContext<AceAssistantContextValue | null>(null);

function getBrowserSearch(): string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

function subscribeToBrowserUrl(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  const wrap = (method: "pushState" | "replaceState") => {
    const original = history[method].bind(history);
    history[method] = (...args: Parameters<History["pushState"]>) => {
      original(...args);
      onChange();
    };
  };
  wrap("pushState");
  wrap("replaceState");
  return () => window.removeEventListener("popstate", onChange);
}

function buildPageContext(route: string, search: string): AiPageContext {
  const ctx: AiPageContext = { route };
  const params = new URLSearchParams(search.replace(/^\?/, ""));

  const idParam = params.get("id");
  if (route.startsWith("/notes") && idParam) {
    ctx.noteId = Number(idParam);
  }
  if (route.startsWith("/service/")) {
    const match = route.match(/^\/service\/(\d+)/);
    if (match) ctx.clientId = Number(match[1]);
  }
  const ch = params.get("channel");
  if (route.startsWith("/channels") && ch) {
    ctx.channelId = Number(ch);
  }
  return ctx;
}

export function AceAssistantProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const [routePath, routeSearch] = useMemo(() => {
    const q = location.indexOf("?");
    if (q === -1) return [location, ""] as const;
    return [location.slice(0, q), location.slice(q)] as const;
  }, [location]);

  const browserSearch = useSyncExternalStore(subscribeToBrowserUrl, getBrowserSearch, () => "");

  const pageContext = useMemo(() => {
    const search =
      typeof window !== "undefined" && window.location.pathname === routePath
        ? browserSearch || routeSearch
        : routeSearch;
    return buildPageContext(routePath, search);
  }, [routePath, routeSearch, browserSearch]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  const consumePendingPrompt = useCallback(() => setPendingPrompt(null), []);

  const openWithPrompt = useCallback((prompt: string) => {
    setConversationId(null);
    setPendingPrompt(prompt);
    setOpen(true);
  }, []);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("open-ace-assistant", onOpen);
    return () => window.removeEventListener("open-ace-assistant", onOpen);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      pageContext,
      conversationId,
      setConversationId,
      pendingPrompt,
      consumePendingPrompt,
      openWithPrompt,
    }),
    [open, toggle, pageContext, conversationId, pendingPrompt, consumePendingPrompt, openWithPrompt],
  );

  return (
    <AceAssistantContext.Provider value={value}>{children}</AceAssistantContext.Provider>
  );
}

export function useAceAssistant() {
  const ctx = useContext(AceAssistantContext);
  if (!ctx) {
    throw new Error("useAceAssistant must be used within AceAssistantProvider");
  }
  return ctx;
}

/** Format context chip label for the panel header */
export function formatContextLabel(ctx: AiPageContext): string | null {
  if (!ctx.route) return null;
  const parts: string[] = [];
  if (ctx.projectId != null) parts.push(`Project #${ctx.projectId}`);
  if (ctx.clientId != null) parts.push(`Client #${ctx.clientId}`);
  if (ctx.noteId != null) parts.push(`Note #${ctx.noteId}`);
  if (ctx.channelId != null) parts.push(`Channel #${ctx.channelId}`);
  if (!parts.length) {
    const seg = ctx.route.split("/").filter(Boolean)[0];
    if (seg) parts.push(seg.charAt(0).toUpperCase() + seg.slice(1));
  }
  return parts.length ? parts.join(" · ") : null;
}
