const https = require("https");
const http = require("http");

/**
 * BuildCity Aradhya Technologies SMS Gateway Module
 * Dispatches 6-digit OTP SMS via Aradhya Technologies HTTPS/HTTP API
 */
async function sendRealSMSOTP(phone, otpCode) {
  const cleanMobile = (phone || "").toString().trim().replace(/\D/g, "").slice(-10);

  const username = "sonevalley";
  const apikey = "0A8CC-B46EE";
  const sender = "SNVLY";
  const templateId = "1707175298595096991";
  const peid = "1701175266640135857";
  const route = "TRANS";

  const message = `Dear user, Thankyou for visiting Sonevalley. Your OTP for login is ${otpCode}. Please do not share this OTP with anyone. Regards SNVLY`;

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

  console.log(`[Aradhya SMS Gateway] Dispatching OTP ${otpCode} to +91 ${cleanMobile}...`);

  return new Promise((resolve) => {
    let resolved = false;

    // 12-Second Timeout safety for Render cloud latency
    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`[Aradhya SMS Gateway] Timeout safety triggered after 12s for +91 ${cleanMobile}`);
        resolve({ success: false, warning: "timeout", gateway: "AradhyaSMS" });
      }
    }, 12000);

    const path = `/sms-panel/api/http/index.php?${queryParams}`;

    function doFetch(protocol, port) {
      const client = protocol === "https" ? https : http;
      const opts = {
        hostname: "sms.aradhyatechnologies.in",
        port,
        path,
        method: "GET",
        rejectUnauthorized: false,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Connection": "close"
        }
      };

      const req = client.request(opts, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutTimer);
            let parsed = null;
            try { parsed = JSON.parse(body); } catch { parsed = { raw: body }; }
            console.log(`[Aradhya SMS Gateway] ${protocol.toUpperCase()} Response for +91 ${cleanMobile}:`, parsed);
            resolve({ success: true, data: parsed, gateway: "AradhyaSMS" });
          }
        });
      });

      req.on("error", (err) => {
        console.warn(`[Aradhya SMS] ${protocol.toUpperCase()} failed:`, err.message);
        if (protocol === "https" && !resolved) {
          console.log(`[Aradhya SMS] Triggering HTTP fallback for +91 ${cleanMobile}...`);
          doFetch("http", 80);
        } else if (!resolved) {
          resolved = true;
          clearTimeout(timeoutTimer);
          resolve({ success: false, error: err.message, gateway: "AradhyaSMS" });
        }
      });

      req.end();
    }

    // Try HTTPS first, auto-fallback to HTTP
    doFetch("https", 443);
  });
}

module.exports = { sendRealSMSOTP };
