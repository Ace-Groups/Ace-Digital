import assert from "node:assert/strict";
import { test } from "node:test";
import type { AccessContext } from "@workspace/rbac";
import { hasPermission } from "@workspace/rbac";
import { checkToolPermission, getToolRequiredPermissions } from "./tool-permissions";

const employee: AccessContext = { userId: 10, role: "employee", teamId: 1 };
const management: AccessContext = { userId: 30, role: "management", teamId: null };

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
