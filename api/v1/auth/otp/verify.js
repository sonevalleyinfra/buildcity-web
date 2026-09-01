import crypto from "node:crypto";
import pg from "pg";
const { Client } = pg;

const JWT_SECRET =
  process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32
    ? process.env.JWT_SECRET.trim()
    : "458680874aaa9f70b9805ecd2e76b4856956b063d538b81ba88cbba7ee804e3b0b22a112e2119510fa047cbb8fc09c7b";
const CONNECTION_STRING =
  "postgresql://postgres.dskzdhfkrpvibwsqfnab:BuildCity2026Pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

// Rate limiting in-memory store for verification attempts (10 attempts per 15 mins per phone)
const failedAttemptsMap = new Map();

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

    // 15-minute Rate Limit Check (Max 10 failed attempts)
    const now = Date.now();
    const attempts = failedAttemptsMap.get(cleanPhone) || [];
    const validAttempts = attempts.filter((t) => now - t < 15 * 60 * 1000);
    failedAttemptsMap.set(cleanPhone, validAttempts);

    if (validAttempts.length >= 10) {
      return res.status(429).json({ error: "Too many attempts. Please try again later." });
    }

    let isValid = false;

    // 1. Cryptographic HMAC Token verification for real SMS OTP
    if (otpToken && typeof otpToken === "string" && otpToken.includes(".")) {
      const [expiresAtStr, hash] = otpToken.split(".");
      const expiresAt = parseInt(expiresAtStr, 10);
      if (expiresAt > Date.now()) {
        const expectedHash = crypto.createHmac("sha256", JWT_SECRET).update(`${cleanPhone}:${otpInput}:${expiresAt}`).digest("hex");
        if (expectedHash === hash) {
          isValid = true;
        }
      }
    }

    // 2. Fallback: Check Supabase PostgreSQL DB directly
    if (!isValid) {
      try {
        const client = new Client({
          connectionString: CONNECTION_STRING,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3500,
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
      validAttempts.push(now);
      failedAttemptsMap.set(cleanPhone, validAttempts);
      return res.status(401).json({
        error: "Invalid or expired OTP. Please enter the exact OTP code sent to your mobile."
      });
    }

    // Reset failed attempts on success
    failedAttemptsMap.delete(cleanPhone);

    // STRICT RESTRICTION: Admin, DR, and Vendor cannot log in via OTP
    const isSpecialStaff = cleanPhone === "9999999999" || cleanPhone === "7777777777";
    let isStaffAccount = isSpecialStaff;

    let realName = (name && typeof name === "string" && name.trim().length > 0) ? name.trim() : null;
    let realEmail = "";
    let realUserId = `cust_${cleanPhone}`;

    // Update `isVerified = true` in Supabase `otp_verifications` table & sync real profile
    try {
      const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3500,
      });
      await client.connect();

      if (!isStaffAccount) {
        const staffRes = await client.query(
          `SELECT 'user' as tbl FROM users WHERE phone = $1 AND role IN ('ADMIN', 'DR', 'VENDOR')
           UNION ALL
           SELECT 'dr' as tbl FROM district_representatives WHERE phone = $1
           UNION ALL
           SELECT 'vendor' as tbl FROM vendors WHERE phone = $1
           LIMIT 1`,
          [cleanPhone]
        );
        if (staffRes.rows && staffRes.rows.length > 0) {
          isStaffAccount = true;
        }
      }

      // Look up existing user
      const userRes = await client.query(
        `SELECT id, name, phone, email, role FROM users WHERE phone = $1 OR phone LIKE $2 LIMIT 1`,
        [cleanPhone, `%${cleanPhone.slice(-10)}`]
      );

      if (userRes.rows && userRes.rows.length > 0) {
        const u = userRes.rows[0];
        realUserId = u.id;
        if (!realName && u.name && !/^customer\s*\d*$/i.test(u.name) && u.name.trim()) {
          realName = u.name.trim();
        }
        realEmail = u.email || "";
      }

      // If name is not found in users table, look in saved addresses
      if (!realName || /^customer\s*\d*$/i.test(realName)) {
        const addrRes = await client.query(
          `SELECT "fullName" FROM addresses WHERE (phone = $1 OR phone LIKE $2) AND "fullName" IS NOT NULL AND "fullName" != '' ORDER BY "createdAt" DESC LIMIT 1`,
          [cleanPhone, `%${cleanPhone.slice(-10)}`]
        );
        if (addrRes.rows && addrRes.rows.length > 0 && addrRes.rows[0].fullName && !/^customer\s*\d*$/i.test(addrRes.rows[0].fullName)) {
          realName = addrRes.rows[0].fullName.trim();
        }
      }

      // Create or update customer record in DB
      if (!userRes.rows || userRes.rows.length === 0) {
        const insRes = await client.query(
          `INSERT INTO users (id, phone, name, role, "tokenVersion", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, 'CUSTOMER', 1, NOW(), NOW())
           RETURNING id, name, phone, email, role`,
          [cleanPhone, realName || `Customer ${cleanPhone.slice(-4)}`]
        );
        if (insRes.rows && insRes.rows.length > 0) {
          realUserId = insRes.rows[0].id;
        }
      } else if (realName && userRes.rows[0].name !== realName && !/^customer\s*\d*$/i.test(realName)) {
        await client.query(
          `UPDATE users SET name = $1 WHERE id = $2`,
          [realName, userRes.rows[0].id]
        ).catch(() => null);
      }

      await client.query(
        'UPDATE otp_verifications SET "isVerified" = true WHERE phone = $1 AND otp = $2',
        [cleanPhone, otpInput]
      );
      await client.end();
    } catch (dbErr) {
      console.warn("DB verify note:", dbErr.message);
    }

    if (isStaffAccount) {
      return res.status(403).json({
        error: "Admin, DR, and Vendor accounts are strictly not allowed to log in via Customer OTP. Please use 'Partner Login (Password)'.",
        isStaffBlocked: true,
      });
    }

    const finalName = realName || `Customer ${cleanPhone.slice(-4)}`;

    // Generate real signed HS256 JWT (7 days expiry)
    const jwtPayload = {
      sub: String(realUserId),
      phone: cleanPhone,
      role: "CUSTOMER",
      tv: 1,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };
    const headerB64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify(jwtPayload)).toString("base64url");
    const signatureB64 = crypto.createHmac("sha256", JWT_SECRET).update(`${headerB64}.${payloadB64}`).digest("base64url");
    const token = `${headerB64}.${payloadB64}.${signatureB64}`;

    const user = {
      id: realUserId,
      phone: cleanPhone,
      name: finalName,
      email: realEmail,
      role: "customer",
      token,
    };

    return res.status(200).json({
      success: true,
      user,
      token,
    });
  } catch (err) {
    return res.status(500).json({ error: "Verification error", details: err.message });
  }
}
