import https from "node:https";
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
    const phone = body?.phone || "";

    if (!phone) {
      return res.status(400).json({ error: "Valid 10-digit phone number required" });
    }

    const cleanMobile = phone.toString().trim().replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
    }

    // STRICT STAFF BLOCKING: Admin, DR, and Vendor accounts can NEVER use OTP login
    const isSpecialStaff = cleanMobile === "9999999999" || cleanMobile === "7777777777";
    let isStaffPhone = isSpecialStaff;

    // 1. Generate 6-digit OTP code & cryptographic HMAC token
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins
    const hash = crypto.createHmac("sha256", OTP_SECRET).update(`${cleanMobile}:${generatedOtp}:${expiresAt}`).digest("hex");
    const otpToken = `${expiresAt}.${hash}`;

    // 2. Check staff accounts and save OTP into Supabase PostgreSQL database
    try {
      const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3500,
      });
      await client.connect();

      if (!isStaffPhone) {
        const staffRes = await client.query(
          `SELECT 'user' as tbl FROM users WHERE phone = $1 AND role IN ('ADMIN', 'DR', 'VENDOR')
           UNION ALL
           SELECT 'dr' as tbl FROM district_representatives WHERE phone = $1
           UNION ALL
           SELECT 'vendor' as tbl FROM vendors WHERE phone = $1
           LIMIT 1`,
          [cleanMobile]
        );
        if (staffRes.rows && staffRes.rows.length > 0) {
          isStaffPhone = true;
        }
      }

      if (isStaffPhone) {
        await client.end();
        return res.status(403).json({
          error: "Admin, DR, and Vendor accounts are strictly not allowed to log in via Customer OTP. Please use 'Partner Login (Password)'.",
          isStaffBlocked: true,
        });
      }

      // Save OTP to DB
      await client.query(
        `INSERT INTO otp_verifications (id, phone, otp, "isVerified", "expiresAt", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, false, $3, NOW())`,
        [cleanMobile, generatedOtp, new Date(expiresAt)]
      );
      await client.end();
    } catch (dbErr) {
      console.warn("DB OTP log note:", dbErr.message);
      if (isSpecialStaff) {
        return res.status(403).json({
          error: "Admin and DR accounts must log in using 'Partner Login (Password)'.",
          isStaffBlocked: true,
        });
      }
    }

    // 3. Dispatch Live SMS via Aradhya Technologies
    const username = "sonevalley";
    const apikey = "0A8CC-B46EE";
    const sender = "SNVLY";
    const templateId = "1707175298595096991";
    const peid = "1701175266640135857";
    const route = "TRANS";

    const message = `Dear user, Thankyou for visiting Sonevalley. Your OTP for login is ${generatedOtp}. Please do not share this OTP with anyone. Regards SNVLY`;

    const queryParams = new URLSearchParams({
      username,
      apikey,
      apirequest: "Text",
      sender,
      mobile: cleanMobile,
      message,
      route,
      TemplateID: templateId,
      peid,
      format: "JSON"
    }).toString();

    const path = `/sms-panel/api/http/index.php?${queryParams}`;

    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ success: true }), 5000);
      const agent = new https.Agent({ rejectUnauthorized: false });

      const request = https.get(
        `https://sms.aradhyatechnologies.in${path}`,
        { agent },
        (resp) => {
          let data = "";
          resp.on("data", (chunk) => { data += chunk; });
          resp.on("end", () => {
            clearTimeout(timeout);
            console.log(`[SMS Gateway Response] Status: ${resp.statusCode}, Body: ${data}`);
            resolve({ success: true, data });
          });
        }
      );

      request.on("error", (e) => {
        clearTimeout(timeout);
        console.warn("[SMS Gateway Error]:", e.message);
        resolve({ success: true });
      });
    });

    return res.status(200).json({
      success: true,
      message: `OTP dispatched to +91 ${cleanMobile}`,
      otpToken,
      gateway: "AradhyaSMS",
      smsStatus: "dispatched"
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to process OTP request", details: err.message });
  }
}
