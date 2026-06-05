#!/usr/bin/env node
/**
 * Ensures DATABASE_URL is available before drizzle-kit push.
 * Usage:
 *   node scripts/ensure-database-url.mjs                    — validate only (exit 1 if missing)
 *   node scripts/ensure-database-url.mjs --init             — copy .env.example → .env if missing
 *   node scripts/ensure-database-url.mjs --require-postgres — also verify TCP reachability
 */
import fs from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const initMode = process.argv.includes("--init");
const requirePostgres = process.argv.includes("--require-postgres");

function parsePgHostPort(url) {
  const m = url.match(/^postgres(?:ql)?:\/\/(?:[^@]+@)?([^:/]+)(?::(\d+))?/i);
  return {
    host: m?.[1] ?? "localhost",
    port: Number(m?.[2] ?? 5432),
  };
}

function checkTcpReachable(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(timeoutMs);
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
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
  return true;
}

function loadAllEnv() {
  const candidates = [
    path.join(repoRoot, ".env"),
    path.join(repoRoot, ".env.local"),
    path.join(repoRoot, "lib/db/.env"),
  ];
  for (const file of candidates) loadEnvFile(file);
}

function copyEnvExample() {
  const target = path.join(repoRoot, ".env");
  if (fs.existsSync(target)) return false;
  const sources = [
    path.join(repoRoot, ".env.example"),
    path.join(repoRoot, "lib/db/.env.example"),
  ];
  for (const src of sources) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, target);
      console.log(`Created ${path.relative(repoRoot, target)} from ${path.relative(repoRoot, src)}`);
      return true;
    }
  }
  return false;
}

if (initMode) {
  copyEnvExample();
}

loadAllEnv();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (databaseUrl) {
  if (requirePostgres) {
    const { host, port } = parsePgHostPort(databaseUrl);
    const reachable = await checkTcpReachable(host, port);
    if (!reachable) {
      console.error(`
Cannot reach Postgres at ${host}:${port}.

Start local Postgres:
  brew services start postgresql@18   # Homebrew, no Docker
  # or: docker compose up -d

Then run:
  pnpm db:setup
  pnpm db:push

Or point DATABASE_URL in .env at your running Postgres instance.
`);
      process.exit(1);
    }
  }
  process.exit(0);
}

console.error(`
DATABASE_URL is not set.

Ace Digital production uses Firestore (Render) — you do NOT need drizzle push for production.
New schema fields apply automatically when the API writes to Firestore.

For LOCAL Postgres schema sync only:
  1. brew services start postgresql@18   # or: docker compose up -d
  2. pnpm db:setup                     # .env + local role/database
  3. pnpm db:push                      # applies Drizzle schema

Or set DATABASE_URL manually:
  export DATABASE_URL=postgresql://ace:ace_dev_password@localhost:5432/ace_digital
`);

process.exit(1);
