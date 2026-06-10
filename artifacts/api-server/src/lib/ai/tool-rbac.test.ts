import assert from "node:assert/strict";
import { test } from "node:test";
import type { AccessContext } from "@workspace/rbac";
import { hasPermission, canAssignRole } from "@workspace/rbac";
import { checkToolPermission, getToolRequiredPermissions } from "./tool-permissions";
import { getToolDeclarations } from "./tool-registry";
import { gateAction } from "./action-tools";
import { formatGeminiErrorForUser, isGeminiQuotaExhausted } from "./gemini-errors";
import { isAgentConfigured } from "./agent-config";
import { isGeminiConfigured } from "./gemini-client";
import { isOpenRouterConfigured } from "./openrouter-client";

const employee: AccessContext = { userId: 10, role: "employee", teamId: 1 };
const hr: AccessContext = { userId: 20, role: "hr", teamId: null };
const management: AccessContext = { userId: 30, role: "management", teamId: null };

function toolNames(ctx: AccessContext): string[] {
  return getToolDeclarations({ ctx }).map((d) => d.name);
}

test("unknown tool returns error without permission flag", () => {
  const result = checkToolPermission(employee, "nonexistent_tool");
  assert.ok(result);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.permissionDenied, false);
    assert.match(String((result.output as { error: string }).error), /Unknown tool/);
  }
});

test("employee denied finance tool", () => {
  const result = checkToolPermission(employee, "check_project_budgets_and_expenses");
  assert.ok(result);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.permissionDenied, true);
  assert.ok(getToolRequiredPermissions("check_project_budgets_and_expenses").length > 0);
});

test("employee denied list_clients", () => {
  const result = checkToolPermission(employee, "list_clients");
  assert.ok(result);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.permissionDenied, true);
});

test("management has dashboard:view for snapshot tool", () => {
  assert.equal(hasPermission(management, "dashboard:view"), true);
  assert.equal(checkToolPermission(management, "get_dashboard_snapshot"), null);
});

test("finance tool permissions declared as any-of", () => {
  const perms = getToolRequiredPermissions("check_project_budgets_and_expenses");
  assert.ok(perms.includes("finance:summary") || perms.includes("finance:expenses_read"));
});

test("list_clients requires clients:read", () => {
  assert.deepEqual(getToolRequiredPermissions("list_clients"), ["clients:read"]);
});

test("employee allowed create_task with tasks:write", () => {
  assert.equal(checkToolPermission(employee, "create_task"), null);
});

test("management allowed create_task", () => {
  assert.equal(checkToolPermission(management, "create_task"), null);
});

test("action tools declared with correct permissions", () => {
  assert.deepEqual(getToolRequiredPermissions("create_task"), ["tasks:write"]);
  assert.deepEqual(getToolRequiredPermissions("post_channel_message"), ["channels:post"]);
  assert.deepEqual(getToolRequiredPermissions("submit_approval"), ["approvals:submit"]);
});

test("new create tools declared with correct permissions", () => {
  assert.deepEqual(getToolRequiredPermissions("create_employee"), ["employees:write"]);
  assert.deepEqual(getToolRequiredPermissions("create_channel"), ["channels:write"]);
  assert.deepEqual(getToolRequiredPermissions("create_project"), ["projects:write"]);
  assert.deepEqual(getToolRequiredPermissions("create_client"), ["clients:write"]);
  assert.deepEqual(getToolRequiredPermissions("create_service_ticket"), ["service_tickets:write"]);
  assert.deepEqual(getToolRequiredPermissions("create_note"), ["notes:write"]);
  assert.deepEqual(getToolRequiredPermissions("get_note"), ["notes:read"]);
  assert.deepEqual(getToolRequiredPermissions("lookup_employee"), ["employees:read"]);
  assert.deepEqual(getToolRequiredPermissions("list_teams"), ["teams:read"]);
});

test("employee denied privileged create tools", () => {
  for (const tool of ["create_employee", "create_client"]) {
    const result = checkToolPermission(employee, tool);
    assert.ok(result, `${tool} should be denied`);
    assert.equal(result?.ok, false);
    if (result && !result.ok) assert.equal(result.permissionDenied, true);
  }
});

test("management allowed create_employee and create_client", () => {
  assert.equal(checkToolPermission(management, "create_employee"), null);
  assert.equal(checkToolPermission(management, "create_client"), null);
});

test("role-filtered declarations hide privileged tools from employees", () => {
  const names = toolNames(employee);
  assert.ok(!names.includes("create_employee"), "employee must not see create_employee");
  assert.ok(!names.includes("list_clients"), "employee must not see list_clients");
});

test("role-filtered declarations expose privileged tools to management", () => {
  const names = toolNames(management);
  assert.ok(names.includes("create_employee"));
  assert.ok(names.includes("create_client"));
});

test("allowedTools allowlist overrides role default (note enrich uses none)", () => {
  assert.equal(getToolDeclarations({ allowedTools: [] }).length, 0);
  const only = getToolDeclarations({ allowedTools: ["get_note"] }).map((d) => d.name);
  assert.deepEqual(only, ["get_note"]);
});

test("confirmation gate withholds execution until confirmed=true", () => {
  const pending = gateAction("create_employee", "Create employee", {}, { fullName: "A" });
  assert.ok(pending);
  assert.equal(pending?.status, "pending_confirmation");
  assert.equal(gateAction("create_employee", "Create employee", { confirmed: true }, {}), null);
});

test("Gemini quota errors map to user-safe billing message", () => {
  const err = new Error(
    '[GoogleGenerativeAI Error]: 429 Too Many Requests — Your prepayment credits are depleted.',
  );
  assert.equal(isGeminiQuotaExhausted(err), true);
  assert.match(formatGeminiErrorForUser(err), /billing balance/i);
  assert.doesNotMatch(formatGeminiErrorForUser(err), /generativelanguage\.googleapis\.com/);
});

test("canAssignRole prevents role escalation via AI create", () => {
  assert.equal(canAssignRole(hr.role, "employee"), true);
  assert.equal(canAssignRole(hr.role, "management"), false);
  assert.equal(canAssignRole(employee.role, "employee"), false);
});

test("isAgentConfigured when only OpenRouter key is set", () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevFallback = process.env.GEMINI_API_KEY_FALLBACK;
  const prevOr = process.env.OPENROUTER_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY_FALLBACK;
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  assert.equal(isGeminiConfigured(), false);
  assert.equal(isOpenRouterConfigured(), true);
  assert.equal(isAgentConfigured(), true);
  if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
  else delete process.env.GEMINI_API_KEY;
  if (prevFallback) process.env.GEMINI_API_KEY_FALLBACK = prevFallback;
  else delete process.env.GEMINI_API_KEY_FALLBACK;
  if (prevOr) process.env.OPENROUTER_API_KEY = prevOr;
  else delete process.env.OPENROUTER_API_KEY;
});

test("isAgentConfigured when only Gemini key is set", () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevOr = process.env.OPENROUTER_API_KEY;
  process.env.GEMINI_API_KEY = "gemini-test";
  delete process.env.OPENROUTER_API_KEY;
  assert.equal(isGeminiConfigured(), true);
  assert.equal(isOpenRouterConfigured(), false);
  assert.equal(isAgentConfigured(), true);
  if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
  else delete process.env.GEMINI_API_KEY;
  if (prevOr) process.env.OPENROUTER_API_KEY = prevOr;
});
