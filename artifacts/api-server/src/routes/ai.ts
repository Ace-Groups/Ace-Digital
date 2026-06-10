import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccessContext, getAccessContextFresh } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import {
  runAgent,
  executeTool,
  assertNoteAccess,
  checkAiRateLimit,
  listAiConversations,
  getAiConversation,
  createAiConversation,
  listAiConversationMessages,
  appendAiMessage,
  type PageContext,
} from "../lib/ai";

const router = Router();

/**
 * Drop any context the user is not allowed to see so a spoofed client payload
 * can never widen what the agent will surface (e.g. a noteId they can't read).
 */
async function sanitizePageContext(
  userId: number,
  pageContext: PageContext | undefined | null,
): Promise<PageContext | null> {
  if (!pageContext) return null;
  const safe: PageContext = { ...pageContext };
  if (safe.noteId != null) {
    const allowed = await assertNoteAccess(userId, safe.noteId);
    if (!allowed) delete safe.noteId;
  }
  return safe;
}

router.post("/v1/ai/chat", requireAuth, async (req, res): Promise<void> => {
  const ctx = await getAccessContextFresh(req);
  const rate = await checkAiRateLimit(ctx.userId);
  if (!rate.allowed) {
    res.status(429).json({ error: "AI rate limit exceeded. Try again later." });
    return;
  }

  const { message, conversationId, pageContext, title } = req.body as {
    message?: string;
    conversationId?: number;
    pageContext?: PageContext;
    title?: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const safeContext = await sanitizePageContext(ctx.userId, pageContext);

  let convId = conversationId;
  if (!convId) {
    const conv = await createAiConversation(
      ctx.userId,
      title?.trim() || message.trim().slice(0, 60),
      safeContext,
    );
    convId = conv.id;
  } else {
    const existing = await getAiConversation(ctx.userId, convId);
    if (!existing) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
  }

  const history = await listAiConversationMessages(ctx.userId, convId);
  const geminiHistory = history.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));

  await appendAiMessage(ctx.userId, convId, "user", message.trim(), null);

  const result = await runAgent({
    ctx,
    prompt: message.trim(),
    pageContext: safeContext,
    history: geminiHistory,
    endpoint: "chat",
  });

  const assistantMsg = await appendAiMessage(
    ctx.userId,
    convId,
    "assistant",
    result.text,
    result.metadata,
  );

  res.json({
    conversationId: convId,
    message: assistantMsg,
    text: result.text,
    metadata: result.metadata,
    toolsUsed: result.toolsUsed,
    rateLimitRemaining: rate.remaining,
  });
});

function aiErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (/FAILED_PRECONDITION|requires an index/i.test(err.message)) {
      return "Ace AI storage is not ready. Contact support or retry in a few minutes.";
    }
    return err.message;
  }
  return "Ace AI request failed.";
}

router.post("/v1/ai/chat/stream", requireAuth, async (req, res): Promise<void> => {
  const ctx = await getAccessContextFresh(req);
  const rate = await checkAiRateLimit(ctx.userId);
  if (!rate.allowed) {
    res.status(429).json({ error: "AI rate limit exceeded. Try again later." });
    return;
  }

  const { message, conversationId, pageContext, title } = req.body as {
    message?: string;
    conversationId?: number;
    pageContext?: PageContext;
    title?: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  let convId: number;
  let geminiHistory: { role: "user" | "model"; parts: { text: string }[] }[];
  let safeContext: PageContext | null;

  try {
    safeContext = await sanitizePageContext(ctx.userId, pageContext);

    if (!conversationId) {
      const conv = await createAiConversation(
        ctx.userId,
        title?.trim() || message.trim().slice(0, 60),
        safeContext,
      );
      convId = conv.id;
    } else {
      const existing = await getAiConversation(ctx.userId, conversationId);
      if (!existing) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      convId = conversationId;
    }

    const history = await listAiConversationMessages(ctx.userId, convId);
    geminiHistory = history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.content }],
    }));

    await appendAiMessage(ctx.userId, convId, "user", message.trim(), null);
  } catch (err) {
    console.error("[AI] stream setup error:", err);
    res.status(500).json({ error: aiErrorMessage(err) });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("start", { conversationId: convId });

  try {
    const result = await runAgent({
      ctx,
      prompt: message.trim(),
      pageContext: safeContext,
      history: geminiHistory,
      endpoint: "chat/stream",
    });

    const words = result.text.split(/(\s+)/);
    for (const chunk of words) {
      send("chunk", { text: chunk });
      await new Promise((r) => setTimeout(r, 12));
    }

    const assistantMsg = await appendAiMessage(
      ctx.userId,
      convId,
      "assistant",
      result.text,
      result.metadata,
    );

    send("done", {
      conversationId: convId,
      message: assistantMsg,
      text: result.text,
      metadata: result.metadata,
      toolsUsed: result.toolsUsed,
      rateLimitRemaining: rate.remaining,
    });
  } catch (err) {
    console.error("[AI] stream error:", err);
    send("error", { error: aiErrorMessage(err) });
  } finally {
    res.end();
  }
});

router.get("/v1/ai/conversations", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const convs = await listAiConversations(ctx.userId);
  res.json(
    convs.map((c) => ({
      id: c.id,
      title: c.title,
      pageContext: c.pageContext,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  );
});

router.get("/v1/ai/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const id = Number(req.params.id);
  const conv = await getAiConversation(ctx.userId, id);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await listAiConversationMessages(ctx.userId, id);
  res.json({
    id: conv.id,
    title: conv.title,
    pageContext: conv.pageContext,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messages: msgs.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

router.post("/v1/ai/actions/confirm", requireAuth, async (req, res): Promise<void> => {
  const ctx = await getAccessContextFresh(req);
  const { conversationId, actionType, payload } = req.body as {
    conversationId?: number;
    actionType?: string;
    payload?: Record<string, unknown>;
  };

  if (!actionType) {
    res.status(400).json({ error: "actionType is required" });
    return;
  }

  // Re-execute the tool with confirmed=true. executeTool re-checks RBAC, and
  // each action's own validation (canAssignRole, canWriteProject, etc.) runs again.
  const result = await executeTool(ctx, actionType, {
    ...(payload ?? {}),
    confirmed: true,
  });

  if (!result.ok) {
    if (result.permissionDenied) {
      res.status(403).json({
        error: `You do not have permission to perform this action.`,
        requiredPermissions: result.requiredPermissions.map(String),
      });
      return;
    }
    res.status(400).json({ error: (result.output as { error?: string })?.error ?? "Action failed" });
    return;
  }

  // Record the completed action in the conversation when one is provided.
  if (conversationId) {
    const existing = await getAiConversation(ctx.userId, conversationId);
    if (existing) {
      await appendAiMessage(
        ctx.userId,
        conversationId,
        "assistant",
        `Done — the ${actionType.replace(/_/g, " ")} action completed successfully.`,
        null,
      );
    }
  }

  res.json({ status: "success", actionType, result: result.output, conversationId: conversationId ?? null });
});

router.post(
  "/v1/ai/reports/narrative",
  requireAuth,
  requirePermission("reports:read"),
  async (req, res): Promise<void> => {
    const ctx = await getAccessContextFresh(req);
    const rate = await checkAiRateLimit(ctx.userId);
    if (!rate.allowed) {
      res.status(429).json({ error: "AI rate limit exceeded." });
      return;
    }

    const { type, period, projectId } = req.body as {
      type?: string;
      period?: string;
      projectId?: number;
    };
    if (!type || !period) {
      res.status(400).json({ error: "type and period are required" });
      return;
    }

    const prompt = `Generate an executive narrative summary for a ${type} report for period "${period}"${
      projectId ? ` focused on project #${projectId}` : ""
    }. Include key insights, risks, and recommended actions. Use generate_report_data first.`;

    const result = await runAgent({
      ctx,
      prompt,
      pageContext: { route: "/reports" },
      endpoint: "reports/narrative",
    });

    res.json({
      narrative: result.text,
      metadata: result.metadata,
      toolsUsed: result.toolsUsed,
    });
  },
);

router.post(
  "/v1/ai/notes/:id/enrich",
  requireAuth,
  requirePermission("notes:read"),
  async (req, res): Promise<void> => {
    const ctx = await getAccessContextFresh(req);
    const noteId = Number(req.params.id);
    if (Number.isNaN(noteId)) {
      res.status(400).json({ error: "Invalid note id" });
      return;
    }

    const allowed = await assertNoteAccess(ctx.userId, noteId);
    if (!allowed) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const rate = await checkAiRateLimit(ctx.userId);
    if (!rate.allowed) {
      res.status(429).json({ error: "AI rate limit exceeded." });
      return;
    }

    const note = await store.findNoteById(noteId);
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const plain = note.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const prompt = `Analyze this note and respond with JSON only:
{
  "summary": "2-3 sentence summary",
  "tags": ["tag1", "tag2"]
}
Note title: ${note.title}
Note content: ${plain.slice(0, 4000)}`;

    const result = await runAgent({
      ctx,
      prompt,
      pageContext: { route: "/notes", noteId },
      endpoint: "notes/enrich",
      allowedTools: [],
    });

    let summary = result.text;
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(result.text) as { summary?: string; tags?: string[] };
      summary = parsed.summary ?? result.text;
      tags = Array.isArray(parsed.tags) ? parsed.tags.map(String) : [];
    } catch {
      // use raw text as summary
    }

    res.json({ summary, tags, metadata: result.metadata });
  },
);

export default router;
