import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canApproveApproval,
  canAssignRole,
  getNavRoutesForRole,
  getPermissionsForRole,
  hasPermission,
} from "./index";

const superAdmin = { userId: 1, role: "super_admin", teamId: 1 };
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
    assert.ok(routes.includes("employees"));
  });
});

describe("permissions list", () => {
  it("client_manager has clients write", () => {
    const perms = getPermissionsForRole("client_manager");
    assert.ok(perms.includes("clients:write"));
  });
});
