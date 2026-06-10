import { store } from "@workspace/db";
import type { AccessContext } from "@workspace/db";
import { getOrCreateAcebotUser } from "./ai/acebot-user";
import { isAgentConfigured, runAgent } from "./ai/run-agent";

const ACEBOT_AVATAR = "/images/ace-ai/ace-ai-avatar.png";

export async function triggerAceBot(
  channelId: number,
  messageId: number,
  body: string,
  userId: number,
): Promise<void> {
  const acebotUser = await getOrCreateAcebotUser();

  const triggeringMsg = await store.findMessageById(messageId);
  const parentMessageId = triggeringMsg?.parentMessageId ?? null;

  if (!isAgentConfigured()) {
    await store.createMessage({
      channelId,
      senderId: acebotUser.id,
      body: "AceBot is currently offline. Configure GEMINI_API_KEY or OPENROUTER_API_KEY on the server.",
      messageKind: "text",
      attachments: null,
      metadata: null,
      parentMessageId,
      editedAt: null,
      deletedAt: null,
      deletedById: null,
      senderName: "AceBot",
      senderAvatar: ACEBOT_AVATAR,
    });
    return;
  }

  const user = await store.findUserById(userId);
  if (!user) {
    console.error(`[AceBot] Trigger user not found: userId=${userId}`);
    return;
  }

  const ctx: AccessContext = {
    userId: user.id,
    role: user.role,
    teamId: user.teamId,
  };

  const promptText = body.replace(/@AceBot/gi, "").trim();
  if (!promptText) {
    await store.createMessage({
      channelId,
      senderId: acebotUser.id,
      body: "Hello! I am AceBot. How can I help you today?",
      messageKind: "text",
      attachments: null,
      metadata: null,
      parentMessageId,
      editedAt: null,
      deletedAt: null,
      deletedById: null,
      senderName: "AceBot",
      senderAvatar: ACEBOT_AVATAR,
    });
    return;
  }

  try {
    const result = await runAgent({
      ctx,
      prompt: promptText,
      pageContext: { route: "/channels", channelId },
      endpoint: "acebot",
    });

    await store.createMessage({
      channelId,
      senderId: acebotUser.id,
      body: result.text,
      messageKind: "text",
      attachments: null,
      metadata: result.metadata,
      parentMessageId,
      editedAt: null,
      deletedAt: null,
      deletedById: null,
      senderName: "AceBot",
      senderAvatar: ACEBOT_AVATAR,
    });
  } catch (err) {
    console.error("[AceBot] Error processing model flow:", err);
    await store.createMessage({
      channelId,
      senderId: acebotUser.id,
      body: "An error occurred while processing the request. Please try again later.",
      messageKind: "text",
      attachments: null,
      metadata: null,
      parentMessageId,
      editedAt: null,
      deletedAt: null,
      deletedById: null,
      senderName: "AceBot",
      senderAvatar: ACEBOT_AVATAR,
    });
  }
}
