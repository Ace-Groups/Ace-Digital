import { logger } from "../logger";

export type AiAuditEntry = {
  userId: number;
  endpoint: string;
  tools: string[];
  durationMs: number;
  denied: boolean;
};

const auditBuffer: AiAuditEntry[] = [];
const MAX_BUFFER = 500;

export async function logAiAudit(entry: AiAuditEntry): Promise<void> {
  auditBuffer.push(entry);
  if (auditBuffer.length > MAX_BUFFER) {
    auditBuffer.shift();
  }
  logger.info(
    {
      ai: true,
      userId: entry.userId,
      endpoint: entry.endpoint,
      tools: entry.tools,
      durationMs: entry.durationMs,
      denied: entry.denied,
    },
    "AI request completed",
  );
}

/** For tests and admin diagnostics */
export function getRecentAiAuditLog(limit = 50): AiAuditEntry[] {
  return auditBuffer.slice(-limit);
}
