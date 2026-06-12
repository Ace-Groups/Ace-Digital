import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canApproveApproval,
  canAssignRole,
  canDeleteMessage,
  canViewProjectBudget,
  getNavRoutesForRole,
  getPermissionsForRole,
  hasPermission,
} from "./index";

const superAdmin = { userId: 1, role: "super_admin", teamId: 1 };
const management = { userId: 5, role: "management", teamId: 1 };
const teamLead = { userId: 2, role: "team_lead", teamId: 1 };
const finance = { userId: 3, role: "finance", teamId: 4 };
const employee = { userId: 4, role: "employee", teamId: 1 };

describe("hasPermission", () => {
  it("super_admin has finance payroll", () => {
    assert.equal(hasPermission(superAdmin, "finance:payroll"), true);
  });
  it("employee cannot read employee directory", () => {
    assert.equal(hasPermission(employee, "employees:read"), false);
    assert.equal(hasPermission(employee, "employees:read_self"), true);
  });
  it("employee can create channels", () => {
    assert.equal(hasPermission(employee, "channels:write"), true);
    assert.equal(hasPermission(employee, "channels:post"), true);
  });
  it("employee cannot read projects or budgets", () => {
    assert.equal(hasPermission(employee, "projects:read"), false);
    assert.equal(hasPermission(employee, "projects:budget"), false);
  });
  it("management can read salaries and payroll but not approve expenses", () => {
    assert.equal(hasPermission(management, "finance:salaries_all"), true);
    assert.equal(hasPermission(management, "finance:payroll"), true);
    assert.equal(hasPermission(management, "finance:expenses_write"), true);
    assert.equal(hasPermission(management, "finance:expenses_approve"), false);
  });
});

describe("canAssignRole", () => {
  it("only super_admin assigns super_admin", () => {
    assert.equal(canAssignRole("management", "super_admin"), false);
    assert.equal(canAssignRole("super_admin", "super_admin"), true);
  });
  it("management assigns team_lead", () => {
    assert.equal(canAssignRole("management", "team_lead"), true);
  });
});

describe("canApproveApproval", () => {
  const leave = {
    type: "LEAVE",
    requestedById: 99,
    teamId: 1,
    status: "PENDING",
  };
  const expense = { type: "EXPENSE", requestedById: 99, teamId: 1, status: "PENDING" };

  it("team_lead approves LEAVE for same team", () => {
    assert.equal(canApproveApproval(teamLead, leave), true);
  });
  it("finance cannot approve LEAVE", () => {
    assert.equal(canApproveApproval(finance, leave), false);
  });
  it("finance approves EXPENSE", () => {
    assert.equal(canApproveApproval(finance, expense), true);
  });
  it("team_lead cannot approve EXPENSE", () => {
    assert.equal(canApproveApproval(teamLead, expense), false);
  });
});

describe("nav", () => {
  it("employee sees limited routes", () => {
    const routes = getNavRoutesForRole("employee");
    assert.ok(routes.includes("dashboard"));
    assert.ok(!routes.includes("clients"));
    assert.ok(!routes.includes("projects"));
    assert.ok(routes.includes("employees"));
  });
});

describe("project budget visibility", () => {
  it("only super_admin and finance can view project budgets", () => {
    assert.equal(canViewProjectBudget(superAdmin), true);
    assert.equal(canViewProjectBudget(finance), true);
    assert.equal(canViewProjectBudget(management), false);
    assert.equal(canViewProjectBudget(teamLead), false);
    assert.equal(canViewProjectBudget(employee), false);
  });
});

describe("permissions list", () => {
  it("client_manager has clients write", () => {
    const perms = getPermissionsForRole("client_manager");
    assert.ok(perms.includes("clients:write"));
  });
});

describe("canDeleteMessage", () => {
  const channel = { createdById: 10 };
  const recent = new Date().toISOString();
  const expired = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const msg = { senderId: 99, createdAt: recent };

  it("sender can delete own recent message", () => {
    assert.equal(
      canDeleteMessage(employee, { senderId: 4, createdAt: recent }, channel, { role: "member" }),
      true,
    );
  });
  it("sender cannot delete own message after 24 hours", () => {
    assert.equal(
      canDeleteMessage(employee, { senderId: 4, createdAt: expired }, channel, { role: "member" }),
      false,
    );
  });
  it("channel creator can delete others recent messages", () => {
    assert.equal(
      canDeleteMessage({ userId: 10, role: "employee", teamId: 1 }, msg, channel, { role: "member" }),
      true,
    );
  });
  it("channel owner can delete others recent messages", () => {
    assert.equal(
      canDeleteMessage(teamLead, msg, { createdById: 99 }, { role: "owner" }),
      true,
    );
  });
  it("super_admin can delete any recent message", () => {
    assert.equal(canDeleteMessage(superAdmin, msg, channel, null), true);
  });
  it("management cannot delete others without owner/creator", () => {
    assert.equal(
      canDeleteMessage(management, msg, { createdById: 99 }, { role: "member" }),
      false,
    );
  });
});
