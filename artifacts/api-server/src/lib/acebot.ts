import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { store } from "@workspace/db";
import { hasPermission, type AccessContext } from "@workspace/rbac";

// Initialize Gen AI SDK
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Ensure dedicated system user for AceBot exists
async function getOrCreateAcebotUser() {
  const email = "system_user_acebot";
  let user = await store.findUserByEmail(email);
  if (!user) {
    user = await store.createUser({
      email,
      fullName: "AceBot",
      passwordHash: "system_secured_password_hash_acebot",
      role: "employee",
      jobTitle: "System AI Agent",
    });
  }
  return user;
}

// Tool Declarations
const queryPendingTasksTool = {
  name: "query_pending_tasks",
  description: "Retrieve pending (non-completed) tasks for a specific project.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      projectId: {
        type: SchemaType.STRING,
        description: "The numeric ID of the project."
      }
    },
    required: ["projectId"]
  }
};

const summarizeClientTicketsTool = {
  name: "summarize_client_tickets",
  description: "Retrieve all service tickets for a specific client to summarize.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      clientId: {
        type: SchemaType.STRING,
        description: "The numeric ID of the client."
      }
    },
    required: ["clientId"]
  }
};

const checkProjectBudgetsAndExpensesTool = {
  name: "check_project_budgets_and_expenses",
  description: "Retrieve financial status: all projects with their budgets, and all expense claims.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {}
  }
};

export async function triggerAceBot(
  channelId: number,
  messageId: number,
  body: string,
  userId: number
): Promise<void> {
  const acebotUser = await getOrCreateAcebotUser();

  // If Gen AI SDK is not initialized, notify the user
  if (!genAI) {
    await store.createMessage({
      channelId,
      senderId: acebotUser.id,
      body: "AceBot is currently offline. GEMINI_API_KEY is not configured in the environment.",
      messageKind: "text",
      attachments: null,
      metadata: null,
      parentMessageId: null,
      editedAt: null,
      deletedAt: null,
      deletedById: null,
      senderName: "AceBot",
      senderAvatar: "/bot-avatar.png",
    });
    return;
  }

  // Fetch request user details to create RBAC AccessContext
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

  // Find parentMessageId to reply to the correct thread if needed
  const triggeringMsg = await store.findMessageById(messageId);
  const parentMessageId = triggeringMsg?.parentMessageId ?? null;

  // Set up model with tools & system instructions
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: [
      {
        functionDeclarations: [
          queryPendingTasksTool,
          summarizeClientTicketsTool,
          checkProjectBudgetsAndExpensesTool,
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
    systemInstruction: `You are AceBot, a system-level AI assistant for Ace Digital.
You have access to tools to query pending tasks, summarize service tickets, and review budgets & expenses.
You must always verify if the user's request is resolved by one of the available tools.
If you need a specific identifier (like projectId or clientId) to fulfill a query, ask the user for it.

When responding to the user, you MUST return your response in this exact JSON structure:
{
  "text": "Your natural language response or summary in Markdown.",
  "table": null | {
    "columns": ["Column Name 1", "Column Name 2"],
    "rows": [
      { "Column Name 1": "value", "Column Name 2": "value" }
    ]
  }
}
If you are presenting tabular data, you MUST structure it in the 'table' field. Otherwise, set 'table' to null.
`,
  });

  try {
    // Strip "@AceBot" mention from the user prompt for cleaner processing
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
        senderAvatar: "/bot-avatar.png",
      });
      return;
    }

    const chat = model.startChat();
    let result = await chat.sendMessage(promptText);

    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      const response = result.response;
      if (!response || !response.functionCalls) break;
      const calls = response.functionCalls();
      if (!calls || calls.length === 0) break;

      iterations++;
      const responses: any[] = [];

      for (const call of calls) {
        const { name, args } = call;
        let output: any;
        let permissionDenied = false;
        let requiredPerms: string[] = [];

        if (name === "query_pending_tasks") {
          requiredPerms = ["tasks:read"];
          if (!hasPermission(ctx, "tasks:read")) {
            permissionDenied = true;
          } else {
            const projectIdStr = (args as any).projectId;
            const projectId = Number(projectIdStr);
            if (Number.isNaN(projectId)) {
              output = { error: "Invalid projectId format. Must be numeric." };
            } else {
              const tasks = await store.listTasksForAccess(ctx, { projectId });
              const pending = tasks.filter((t: any) => t.status !== "DONE");
              output = {
                status: "success",
                tasks: pending.map((t: any) => ({
                  id: t.id,
                  title: t.title,
                  status: t.status,
                  priority: t.priority,
                  progress: t.progress,
                  dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                })),
              };
            }
          }
        } else if (name === "summarize_client_tickets") {
          requiredPerms = ["service_tickets:read"];
          if (!hasPermission(ctx, "service_tickets:read")) {
            permissionDenied = true;
          } else {
            const clientIdStr = (args as any).clientId;
            const clientId = Number(clientIdStr);
            if (Number.isNaN(clientId)) {
              output = { error: "Invalid clientId format. Must be numeric." };
            } else {
              const tickets = await store.listServiceTicketsForAccess(ctx, { clientId });
              output = {
                status: "success",
                tickets: tickets.map((t: any) => ({
                  id: t.id,
                  ticketNumber: t.ticketNumber,
                  title: t.title,
                  status: t.status,
                  priority: t.priority,
                  category: t.category,
                  description: t.description || "",
                })),
              };
            }
          }
        } else if (name === "check_project_budgets_and_expenses") {
          requiredPerms = ["finance:summary", "finance:expenses_read"];
          if (
            !hasPermission(ctx, "finance:summary") &&
            !hasPermission(ctx, "finance:expenses_read")
          ) {
            permissionDenied = true;
          } else {
            const projects = await store.listProjectsForAccess(ctx);
            const expenses = await store.listExpenses();
            output = {
              status: "success",
              projects: projects.map((p: any) => ({
                id: p.id,
                name: p.name,
                budget: p.budget,
                status: p.status,
              })),
              expenses: expenses.map((e: any) => ({
                id: e.id,
                description: e.description,
                amount: e.amount,
                status: e.status,
              })),
            };
          }
        } else {
          output = { error: `Unknown tool name: ${name}` };
        }

        if (permissionDenied) {
          // Cleanly reject with permission denied card and halt chat
          await store.createMessage({
            channelId,
            senderId: acebotUser.id,
            body: `ACCESS DENIED: Insufficient permissions to execute the query. User role '${ctx.role}' does not have clearance for: ${requiredPerms.join(", ")}.`,
            messageKind: "text",
            attachments: null,
            metadata: {
              layout: "permission_denied",
              errorDetails: {
                userId: ctx.userId,
                role: ctx.role,
                requiredPermissions: requiredPerms,
              },
            },
            parentMessageId,
            editedAt: null,
            deletedAt: null,
            deletedById: null,
            senderName: "AceBot",
            senderAvatar: "/bot-avatar.png",
          });
          return;
        }

        responses.push({
          functionResponse: {
            name,
            response: output,
          },
        });
      }

      result = await chat.sendMessage(responses);
    }

    // Process final Gemini response text
    let responseText = "";
    try {
      responseText = result.response.text();
    } catch (e) {
      console.error("[AceBot] Error reading response text:", e);
    }

    let parsedText = responseText;
    let payloadMetadata: any = null;

    try {
      const parsed = JSON.parse(responseText);
      parsedText = parsed.text || responseText;
      if (parsed.table) {
        payloadMetadata = {
          layout: "table",
          tableData: parsed.table,
        };
      }
    } catch {
      // Fallback if model output is not valid JSON
    }

    // Post final answer back to stream
    await store.createMessage({
      channelId,
      senderId: acebotUser.id,
      body: parsedText,
      messageKind: "text",
      attachments: null,
      metadata: payloadMetadata,
      parentMessageId,
      editedAt: null,
      deletedAt: null,
      deletedById: null,
      senderName: "AceBot",
      senderAvatar: "/bot-avatar.png",
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
      senderAvatar: "/bot-avatar.png",
    });
  }
}
