import pg from "pg";
const { Client } = pg;

const CONNECTION_STRINGS = [
  "postgresql://postgres.dskzdhfkrpvibwsqfnab:BuildCity2026Pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  "postgresql://postgres.dskzdhfkrpvibwsqfnab:BuildCity2026Pass@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
];

async function getConnectedClient() {
  let lastErr;
  for (const connStr of CONNECTION_STRINGS) {
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastErr = err;
      try { await client.end(); } catch {}
    }
  }
  throw lastErr || new Error("Failed to connect to Supabase Database");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let client;
  try {
    client = await getConnectedClient();

    // 1. GET: Fetch all broadcast notifications for all customers
    if (req.method === "GET") {
      const result = await client.query(
        'SELECT id, "userId", title, message, "isRead", "createdAt" FROM notifications ORDER BY "createdAt" DESC LIMIT 50'
      );
      return res.status(200).json(result.rows);
    }

    // 2. POST: Admin broadcasts a new notification to customers
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      const { title, message, userId } = body || {};
      if (!title || !message) {
        return res.status(400).json({ error: "Title and message are required" });
      }

      // Pick a valid user ID for foreign key constraint
      let targetUserId = userId;
      if (!targetUserId || targetUserId.length < 20) {
        const userRes = await client.query("SELECT id FROM users LIMIT 1");
        targetUserId = userRes.rows[0]?.id;
      }

      const insertRes = await client.query(
        `INSERT INTO notifications (id, "userId", title, message, "isRead", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, false, NOW())
         RETURNING *`,
        [targetUserId, title.trim(), message.trim()]
      );

      const created = insertRes.rows[0];
      return res.status(201).json({
        success: true,
        notification: created,
      });
    }

    // 3. PATCH: Mark notification as read
    if (req.method === "PATCH") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const { id } = req.query || body || {};
      if (id) {
        await client.query('UPDATE notifications SET "isRead" = true WHERE id = $1', [id]);
      }
      return res.status(200).json({ success: true });
    }

    // 4. DELETE: Delete notification
    if (req.method === "DELETE") {
      const { id } = req.query || {};
      if (id) {
        await client.query('DELETE FROM notifications WHERE id = $1', [id]);
      } else {
        await client.query('DELETE FROM notifications');
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    console.error("Vercel Supabase Notification Gateway Error:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (client) {
      try { await client.end(); } catch {}
    }
  }
}
