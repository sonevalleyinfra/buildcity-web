import crypto from "node:crypto";
import pg from "pg";
const { Client } = pg;

const OTP_SECRET = "BuildCity_Super_Secret_OTP_HMAC_Key_2026_Varanasi_UP";
const CONNECTION_STRING =
  "postgresql://postgres.dskzdhfkrpvibwsqfnab:BuildCity2026Pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { phone, otp, otpToken, name } = body || {};

    if (!phone || !otp) {
      return res.status(400).json({ error: "Phone and OTP required" });
    }

    const cleanPhone = phone.toString().trim().replace(/\D/g, "").slice(-10);
    const otpInput = otp.toString().trim();

    let isValid = false;

    // 1. Cryptographic HMAC Token verification for real SMS OTP
    if (otpToken && typeof otpToken === "string" && otpToken.includes(".")) {
      const [expiresAtStr, hash] = otpToken.split(".");
      const expiresAt = parseInt(expiresAtStr, 10);
      if (expiresAt > Date.now()) {
        const expectedHash = crypto.createHmac("sha256", OTP_SECRET).update(`${cleanPhone}:${otpInput}:${expiresAt}`).digest("hex");
        if (expectedHash === hash) {
          isValid = true;
        }
      }
    }

    // 3. Fallback: Check Supabase PostgreSQL DB directly if token expired or missing
    if (!isValid) {
      try {
        const client = new Client({
          connectionString: CONNECTION_STRING,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000,
        });
        await client.connect();
        const dbOtpRes = await client.query(
          'SELECT id FROM otp_verifications WHERE phone = $1 AND otp = $2 AND "expiresAt" > NOW() ORDER BY "createdAt" DESC LIMIT 1',
          [cleanPhone, otpInput]
        );
        if (dbOtpRes.rows.length > 0) {
          isValid = true;
        }
        await client.end();
      } catch (dbErr) {
        console.warn("DB check fallback note:", dbErr.message);
      }
    }

    if (!isValid) {
      return res.status(401).json({
        error: "Invalid or expired OTP. Please enter the exact OTP code sent to your mobile."
      });
    }

    // Update `isVerified = true` in Supabase `otp_verifications` table
    try {
      const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000,
      });
      await client.connect();
      await client.query(
        'UPDATE otp_verifications SET "isVerified" = true WHERE phone = $1 AND otp = $2',
        [cleanPhone, otpInput]
      );
      await client.end();
    } catch (dbUpdateErr) {
      console.warn("DB isVerified update note:", dbUpdateErr.message);
    }

    const user = {
      id: `cust_${cleanPhone}`,
      phone: cleanPhone,
      name: name || "",
      role: "customer",
      token: `jwt_token_${cleanPhone}_${Date.now()}`
    };

    return res.status(200).json({
      success: true,
      user,
      token: user.token
    });
  } catch (err) {
    return res.status(500).json({ error: "Verification error", details: err.message });
  }
}
