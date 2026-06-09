/**
 * Ensure chat snapshot columns and backfill sender/display names from users.
 * Run: pnpm --filter @workspace/scripts run backfill:chat-snapshots
 */
import { sql } from "drizzle-orm";
import { closePgPool, getPgDb } from "@workspace/db/pg";

async function ensureChatSnapshotColumns(db: ReturnType<typeof getPgDb>["db"]) {
  await db.execute(sql`
    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS sender_name text,
      ADD COLUMN IF NOT EXISTS sender_avatar text
  `);
  await db.execute(sql`
    ALTER TABLE channel_members
      ADD COLUMN IF NOT EXISTS display_name text,
      ADD COLUMN IF NOT EXISTS display_avatar text,
      ADD COLUMN IF NOT EXISTS unavailable_at timestamptz
  `);
}

async function main() {
  const { db } = getPgDb();

  await ensureChatSnapshotColumns(db);
  console.log("[backfill] chat snapshot columns ensured");

  const messageResult = await db.execute(sql`
    UPDATE messages m
    SET
      sender_name = COALESCE(m.sender_name, u.full_name),
      sender_avatar = COALESCE(m.sender_avatar, u.avatar_url)
    FROM users u
    WHERE m.sender_id = u.id
      AND (m.sender_name IS NULL OR m.sender_avatar IS NULL)
  `);

  const memberResult = await db.execute(sql`
    UPDATE channel_members cm
    SET
      display_name = COALESCE(cm.display_name, u.full_name),
      display_avatar = COALESCE(cm.display_avatar, u.avatar_url)
    FROM users u
    WHERE cm.user_id = u.id
      AND (cm.display_name IS NULL OR cm.display_avatar IS NULL)
  `);

  console.log("[backfill] messages updated:", messageResult.rowCount ?? 0);
  console.log("[backfill] channel_members updated:", memberResult.rowCount ?? 0);

  await closePgPool();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
