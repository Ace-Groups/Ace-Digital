import { ALL_ROLES, type Role } from "./types";

export function isRole(role: string): role is Role {
  return (ALL_ROLES as readonly string[]).includes(role);
}

const RANK: Record<Role, number> = {
  super_admin: 100,
  management: 80,
  finance: 70,
  hr: 70,
  client_manager: 50,
  team_lead: 40,
  employee: 10,
};

export function roleRank(role: string): number {
  if (!isRole(role)) return 0;
  return RANK[role];
}

export function isOrgWideRole(role: string): boolean {
  return role === "super_admin" || role === "management" || role === "finance" || role === "hr";
}

export function isTeamScopedRole(role: string): boolean {
  return role === "team_lead" || role === "employee";
}
