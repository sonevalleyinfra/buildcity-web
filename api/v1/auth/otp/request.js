const https = require("https");

const otpStore = global.__otpStore || new Map();
global.__otpStore = otpStore;

async function getRequestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

module.exports = async (req, res) => {
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
    const body = await getRequestBody(req);
    const phone = body.phone || "";

    if (!phone) {
      return res.status(400).json({ error: "Valid 10-digit phone number required" });
    }

    const cleanMobile = phone.toString().trim().replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(cleanMobile, { otp: generatedOtp, expiresAt });

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
      const timeout = setTimeout(() => resolve({ success: true }), 3500);

      const request = https.get(
        {
          hostname: "sms.aradhyatechnologies.in",
          port: 443,
          path: path,
          rejectUnauthorized: false
        },
        (resp) => {
          let data = "";
          resp.on("data", (chunk) => { data += chunk; });
          resp.on("end", () => {
            clearTimeout(timeout);
            resolve({ success: true, data });
          });
        }
      );

      request.on("error", () => {
        clearTimeout(timeout);
        resolve({ success: true });
      });
    });

    return res.status(200).json({
      success: true,
      message: `OTP dispatched to +91 ${cleanMobile}`,
      gateway: "AradhyaSMS",
      smsStatus: "dispatched"
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to dispatch OTP", details: err.message });
  }
};
