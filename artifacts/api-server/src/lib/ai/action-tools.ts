/** Confirmation gate for mutating AI tools — never execute without explicit confirmed=true. */
export function gateAction(
  actionType: string,
  summary: string,
  args: Record<string, unknown>,
  payload: Record<string, unknown>,
): { status: string; requiresConfirmation: true; actionType: string; summary: string; payload: Record<string, unknown>; message: string } | null {
  if (args.confirmed === true) return null;
  return {
    status: "pending_confirmation",
    requiresConfirmation: true,
    actionType,
    summary,
    payload,
    message: `Action requires confirmation: ${summary}. Re-call this tool with confirmed=true to execute.`,
  };
}
