import { randomBytes } from "node:crypto";

const CHARSET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";

export function generateTemporaryPassword(fullName?: string, phone?: string | null): string {
  if (fullName) {
    const cleanName = fullName.replace(/[^a-zA-Z]/g, "");
    const namePart = (cleanName.length >= 4 ? cleanName.slice(0, 4) : cleanName.padEnd(4, "x")).toLowerCase();
    const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    
    const cleanPhone = (phone || "").replace(/\D/g, "");
    const phonePart = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : cleanPhone.padStart(4, "0");
    
    return `${capitalizedName}${phonePart}`;
  }

  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += CHARSET[bytes[i]! % CHARSET.length];
  }
  return out;
}
