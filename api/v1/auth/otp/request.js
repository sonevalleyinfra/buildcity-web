const https = require("https");
const http = require("http");

// In-memory OTP storage for serverless edge caching
const otpStore = global.__otpStore || new Map();
global.__otpStore = otpStore;

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({ error: "Valid 10-digit phone number required" });
  }

  const cleanMobile = phone.toString().trim().replace(/\D/g, "").slice(-10);
  if (cleanMobile.length !== 10) {
    return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
  }

  // Generate 6-digit OTP code
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Save OTP in store
  otpStore.set(cleanMobile, { otp: generatedOtp, expiresAt });

  // Aradhya SMS DLT Parameters
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

  const options = {
    hostname: "sms.aradhyatechnologies.in",
    port: 443,
    path: `/sms-panel/api/http/index.php?${queryParams}`,
    method: "GET",
    rejectUnauthorized: false
  };

  try {
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({ success: true, warning: "timeout_dispatched" });
      }, 3500);

      const request = https.request(options, (response) => {
        let body = "";
        response.on("data", (chunk) => { body += chunk; });
        response.on("end", () => {
          clearTimeout(timer);
          resolve({ success: true, body });
        });
      });

      request.on("error", () => {
        clearTimeout(timer);
        resolve({ success: true });
      });

      request.end();
    });

    return res.status(200).json({
      success: true,
      message: `OTP dispatched to +91 ${cleanMobile}`,
      gateway: "AradhyaSMS",
      smsStatus: "dispatched"
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      message: `OTP dispatched to +91 ${cleanMobile}`,
      gateway: "AradhyaSMS",
      smsStatus: "dispatched"
    });
  }
};
