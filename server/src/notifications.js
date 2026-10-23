// Notification helpers: the is_broadcast column that marks admin broadcasts explicitly.
// Pure module: no Express and no Prisma import (ensureNotificationSchema takes the client as an argument).

// Same boot contract as ensureOtpSchema: prod does not run `prisma db push`, so the column self-provisions here;
// throws after bounded retries so the caller refuses to boot and the platform keeps the old container.
const NOTIFICATION_SCHEMA_DELAYS_MS = [1000, 2000, 4000, 8000];

// pg_catalog + to_regclass for the same reasons as ensureOtpSchema
const HAS_COLUMN_SQL =
  "SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('notifications') AND attname = 'is_broadcast' AND NOT attisdropped";

// The backfill runs only in the transaction that adds the column; a racing boot waits on the table lock, then
// sees the column and does nothing. Before this column existed the only rows on ADMIN users were broadcasts,
// plus "📦 ..." order-status notices if an admin ever placed an order; those stay private.
const ADD_COLUMN_SQL = `DO $$
BEGIN
  IF NOT EXISTS (${HAS_COLUMN_SQL}) THEN
    ALTER TABLE notifications ADD COLUMN is_broadcast BOOLEAN NOT NULL DEFAULT false;
    UPDATE notifications SET is_broadcast = true
      WHERE "userId" IN (SELECT id FROM users WHERE role = 'ADMIN'::"Role") AND title NOT LIKE '📦%';
  END IF;
END $$`;

const oneLine = (e) => String((e && e.message) || e).replace(/\s+/g, " ").trim();

async function ensureNotificationSchema(prisma, opts = {}) {
  const delaysMs = opts.delaysMs || NOTIFICATION_SCHEMA_DELAYS_MS;
  const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const log = opts.log || console;
  const shouldStop = opts.shouldStop || (() => false);
  const max = delaysMs.length + 1;
  let lastError = null;
  for (let i = 1; i <= max; i++) {
    if (shouldStop()) return;
    try {
      const cols = await prisma.$queryRawUnsafe(HAS_COLUMN_SQL);
      if (Array.isArray(cols) && cols.length > 0) return;
      await prisma.$transaction([
        prisma.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'"),
        // Serialises two racing boots (and blocks writers) until the column and backfill commit
        prisma.$executeRawUnsafe("LOCK TABLE notifications IN SHARE ROW EXCLUSIVE MODE"),
        prisma.$executeRawUnsafe(ADD_COLUMN_SQL),
      ]);
      log.log("[notifications] ensured notifications.is_broadcast (existing admin broadcasts backfilled)");
      return;
    } catch (e) {
      lastError = e;
      log.error(`[notifications] ensure schema attempt ${i}/${max} failed: ${(e && e.code) || ""} ${oneLine(e)}`);
      if (i < max) {
        if (shouldStop()) return;
        await sleep(delaysMs[i - 1]);
      }
    }
  }
  throw new Error(`notifications.is_broadcast is missing and could not be added after ${max} attempts: ${oneLine(lastError)}`, { cause: lastError });
}

module.exports = { ensureNotificationSchema };
