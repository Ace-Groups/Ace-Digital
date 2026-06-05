#!/usr/bin/env node
/**
 * Creates the local ace / ace_digital role+database expected by .env.example.
 * Works with Homebrew Postgres (no Docker required).
 */
import { spawnSync } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
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

loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(repoRoot, ".env.local"));

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://ace:ace_dev_password@localhost:5432/ace_digital";

const match = databaseUrl.match(
  /^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/i,
);
if (!match) {
  console.error("DATABASE_URL format not recognized for local setup.");
  process.exit(1);
}

const [, user, password, host, portRaw, database] = match;
const port = Number(portRaw ?? 5432);

function tcpReachable() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(3000);
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function runPsql(sql, connection = "postgres") {
  const result = spawnSync("psql", [connection, "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(err || `psql failed (${result.status})`);
  }
  return result.stdout?.trim() ?? "";
}

function pgClientCanConnect() {
  const result = spawnSync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", "SELECT 1;"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return result.status === 0;
}

if (!(await tcpReachable())) {
  console.error(`
Postgres is not running on ${host}:${port}.

Homebrew (no Docker):
  brew services start postgresql@18

Docker:
  docker compose up -d
`);
  process.exit(1);
}

if (pgClientCanConnect()) {
  console.log(`Local Postgres ready (${user}@${host}:${port}/${database}).`);
  process.exit(0);
}

const escapedPassword = password.replace(/'/g, "''");
try {
  runPsql(
    `DO $$ BEGIN CREATE ROLE ${user} WITH LOGIN PASSWORD '${escapedPassword}' CREATEDB; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  );
  const exists = runPsql(
    `SELECT 1 FROM pg_database WHERE datname='${database.replace(/'/g, "''")}';`,
  );
  if (!exists.includes("1")) {
    runPsql(`CREATE DATABASE ${database} OWNER ${user};`);
  }
} catch (error) {
  console.error(`
Could not create local role/database automatically.

Create them manually:
  psql postgres -c "CREATE ROLE ${user} WITH LOGIN PASSWORD '${password}' CREATEDB;"
  psql postgres -c "CREATE DATABASE ${database} OWNER ${user};"

Error: ${error instanceof Error ? error.message : String(error)}
`);
  process.exit(1);
}

if (pgClientCanConnect()) {
  console.log(`Created and verified ${user}@${host}:${port}/${database}.`);
  process.exit(0);
}

console.error("Role/database setup ran but DATABASE_URL still cannot connect.");
process.exit(1);
