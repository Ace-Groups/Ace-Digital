import mascot1 from "@/assets/mascots/mascot-1.png";
import mascot2 from "@/assets/mascots/mascot-2.png";
import mascot3 from "@/assets/mascots/mascot-3.png";
import mascot4 from "@/assets/mascots/mascot-4.png";
import mascot5 from "@/assets/mascots/mascot-5.png";
import mascot6 from "@/assets/mascots/mascot-6.png";
import mascot7 from "@/assets/mascots/mascot-7.png";
import mascot8 from "@/assets/mascots/mascot-8.png";
import mascot9 from "@/assets/mascots/mascot-9.png";
import mascot10 from "@/assets/mascots/mascot-10.png";
import mascot11 from "@/assets/mascots/mascot-11.png";
import mascot12 from "@/assets/mascots/mascot-12.png";
import mascot13 from "@/assets/mascots/mascot-13.png";
import mascot14 from "@/assets/mascots/mascot-14.png";
import mascot15 from "@/assets/mascots/mascot-15.png";

export const MASCOT_PREFIX = "mascot:";

export const MASCOT_SOURCES: Record<string, string> = {
  "1": mascot1, "2": mascot2, "3": mascot3, "4": mascot4, "5": mascot5,
  "6": mascot6, "7": mascot7, "8": mascot8, "9": mascot9, "10": mascot10,
  "11": mascot11, "12": mascot12, "13": mascot13, "14": mascot14, "15": mascot15,
};

export const MASCOTS = Object.entries(MASCOT_SOURCES).map(([id, src]) => ({
  id,
  src,
  label: `Ace ${id}`,
}));

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
  return `${MASCOT_PREFIX}${id}`;
}

export function parseMascotId(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.startsWith(MASCOT_PREFIX)) return null;
  const id = avatarUrl.slice(MASCOT_PREFIX.length);
  return MASCOT_SOURCES[id] ? id : null;
}

export function getMascotSrc(id: string): string | undefined {
  return MASCOT_SOURCES[id];
}

export function isRoleDefaultMascot(avatarUrl: string | null | undefined, role: string): boolean {
  if (!avatarUrl) return true;
  return avatarUrl === defaultMascotForRole(role);
}
