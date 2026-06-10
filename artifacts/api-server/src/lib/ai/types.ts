import type { Permission } from "@workspace/rbac";

export type PageContext = {
  route?: string;
  projectId?: number;
  clientId?: number;
  noteId?: number;
  channelId?: number;
};

export type AiTableData = {
  columns: string[];
  rows: Record<string, unknown>[];
};

export type AiMessageMetadata = {
  layout?: "table" | "permission_denied";
  tableData?: AiTableData;
  errorDetails?: {
    userId: number;
    role: string;
    requiredPermissions: string[];
  };
  toolsUsed?: string[];
};

export type AgentResult = {
  text: string;
  metadata: AiMessageMetadata | null;
  permissionDenied: boolean;
  toolsUsed: string[];
};

export type ToolExecutionResult =
  | { ok: true; output: unknown }
  | { ok: false; permissionDenied: true; requiredPermissions: Permission[] }
  | { ok: false; permissionDenied: false; output: { error: string } };

export type AiConversation = {
  id: number;
  userId: number;
  title: string;
  pageContext: PageContext | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AiConversationMessage = {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  metadata: AiMessageMetadata | null;
  createdAt: Date;
};
