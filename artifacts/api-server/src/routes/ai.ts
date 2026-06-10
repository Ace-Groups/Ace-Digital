import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccessContext, getAccessContextFresh } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import {
  runAgent,
  checkAiRateLimit,
  listAiConversations,
  getAiConversation,
  createAiConversation,
  listAiConversationMessages,
  appendAiMessage,
  type PageContext,
} from "../lib/ai";

const router = Router();

async function assertNoteAccess(userId: number, noteId: number): Promise<boolean> {
  const note = await store.findNoteById(noteId);
  if (!note) return false;
  const user = await store.findUserById(userId);
  if (
    note.createdById === userId ||
    note.sharedUserIds?.includes(userId) ||
    (note.teamId != null && note.teamId === user?.teamId)
  ) {
    return true;
  }
  return false;
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

  let convId = conversationId;
  if (!convId) {
    const conv = await createAiConversation(
      ctx.userId,
      title?.trim() || message.trim().slice(0, 60),
      pageContext ?? null,
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
    pageContext: pageContext ?? null,
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

  let convId = conversationId;
  if (!convId) {
    const conv = await createAiConversation(
      ctx.userId,
      title?.trim() || message.trim().slice(0, 60),
      pageContext ?? null,
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
      pageContext: pageContext ?? null,
      history: geminiHistory,
      endpoint: "chat/stream",
    });

    const words = result.text.split(/(\s+)/);
    let accumulated = "";
    for (const chunk of words) {
      accumulated += chunk;
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
    send("error", { error: "Stream failed" });
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
