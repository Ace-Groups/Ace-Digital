import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPgDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for PostgreSQL mode.");
  }
  if (!dbInstance) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 50,
    });
    dbInstance = drizzle(pool, { schema });
  }
  return { db: dbInstance, pool };
}

export async function closePgPool() {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}
