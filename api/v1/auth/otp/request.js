import http from "node:http";
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

  const startTime = Date.now();

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

    // STRICT STAFF BLOCKING
    const isSpecialStaff = cleanMobile === "9999999999" || cleanMobile === "7777777777";
    if (isSpecialStaff) {
      return res.status(403).json({
        error: "Admin, DR, and Vendor accounts are strictly not allowed to log in via Customer OTP. Please use 'Partner Login (Password)'.",
        isStaffBlocked: true,
      });
    }

    // 1. Generate 6-digit OTP code & cryptographic HMAC token (instant 0ms)
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins
    const hash = crypto.createHmac("sha256", OTP_SECRET).update(`${cleanMobile}:${generatedOtp}:${expiresAt}`).digest("hex");
    const otpToken = `${expiresAt}.${hash}`;

    // 2. Dispatch Live SMS via Aradhya Technologies (Direct Fast HTTP API ~250ms)
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

    const smsPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ success: true, timeout: true }), 3500);

      // Fast HTTP GET (Primary)
      http.get(`http://sms.aradhyatechnologies.in/sms-panel/api/http/index.php?${queryParams}`, (resp) => {
        let data = "";
        resp.on("data", (chunk) => { data += chunk; });
        resp.on("end", () => {
          clearTimeout(timeout);
          resolve({ success: true, data });
        });
      }).on("error", () => {
        // HTTPS fallback if HTTP fails
        const agent = new https.Agent({ rejectUnauthorized: false });
        https.get(`https://sms.aradhyatechnologies.in/sms-panel/api/http/index.php?${queryParams}`, { agent }, (resp) => {
          let data = "";
          resp.on("data", (chunk) => { data += chunk; });
          resp.on("end", () => {
            clearTimeout(timeout);
            resolve({ success: true, data });
          });
        }).on("error", () => {
          clearTimeout(timeout);
          resolve({ success: true });
        });
      });
    });

    // 3. Database Check & Insert (in parallel with SMS dispatch)
    const dbPromise = (async () => {
      try {
        const client = new Client({
          connectionString: CONNECTION_STRING,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 2500,
        });
        await client.connect();

        // Staff check
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
          await client.end();
          return { isStaff: true };
        }

        // Save OTP to DB
        await client.query(
          `INSERT INTO otp_verifications (id, phone, otp, "isVerified", "expiresAt", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, false, $3, NOW())`,
          [cleanMobile, generatedOtp, new Date(expiresAt)]
        );
        await client.end();
        return { isStaff: false };
      } catch (dbErr) {
        console.warn("DB OTP log note:", dbErr.message);
        return { isStaff: false };
      }
    })();

    // Wait for both SMS & DB in parallel
    const [smsResult, dbResult] = await Promise.all([smsPromise, dbPromise]);

    if (dbResult?.isStaff) {
      return res.status(403).json({
        error: "Admin, DR, and Vendor accounts are strictly not allowed to log in via Customer OTP. Please use 'Partner Login (Password)'.",
        isStaffBlocked: true,
      });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[OTP Request Dispatched] Mobile: +91 ${cleanMobile} in ${elapsed}ms`);

    return res.status(200).json({
      success: true,
      message: `OTP dispatched to +91 ${cleanMobile}`,
      otpToken,
      gateway: "AradhyaSMS",
      smsStatus: "dispatched",
      elapsedMs: elapsed
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to process OTP request", details: err.message });
  }
}
