import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const repoRoot = path.resolve(__dirname, "../..");
for (const file of [
  path.join(repoRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(__dirname, ".env"),
]) {
  loadEnvFile(file);
}

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error(
    [
      "DATABASE_URL is not set.",
      "",
      "Quick fix:",
      "  pnpm db:setup",
      "  docker compose up -d",
      "  pnpm db:push",
      "",
      "Or copy .env.example to .env and set DATABASE_URL.",
      "Production (Firestore on Render) does not require drizzle push.",
    ].join("\n"),
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
