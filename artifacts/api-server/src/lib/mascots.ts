/** Role → default mascot id stored as mascot:<id> in avatarUrl */
export const ROLE_DEFAULT_MASCOT: Record<string, string> = {
  super_admin: "1",
  management: "2",
  finance: "3",
  hr: "4",
  client_manager: "5",
  team_lead: "6",
  employee: "7",
};

export function defaultMascotForRole(role: string): string {
  const id = ROLE_DEFAULT_MASCOT[role] ?? "7";
  return `mascot:${id}`;
}

export function isRoleDefaultMascot(avatarUrl: string | null | undefined, role: string): boolean {
  if (!avatarUrl) return true;
  const expected = defaultMascotForRole(role);
  return avatarUrl === expected;
}
