const https = require("https");
const http = require("http");

/**
 * BuildCity Aradhya Technologies SMS Gateway Module
 * Dispatches 6-digit OTP SMS via Aradhya Technologies HTTP/HTTPS API
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

    // Timeout safety (8s) so the UI response never hangs forever.
    // NOTE: this only fires if BOTH the HTTPS attempt and the HTTP fallback
    // below haven't resolved yet — it does not mean the SMS was sent.
    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`[Aradhya SMS Gateway] Timeout safety triggered after 8s for +91 ${cleanMobile} — SMS status unknown, treat as failed.`);
        resolve({ success: false, warning: "timeout", gateway: "AradhyaSMS" });
      }
    }, 8000);

    const path = `/sms-panel/api/http/index.php?${queryParams}`;

    function tryHttpFallback() {
      http.get(`http://sms.aradhyatechnologies.in${path}`, (httpRes) => {
        let httpData = "";
        httpRes.on("data", (chunk) => { httpData += chunk; });
        httpRes.on("end", () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutTimer);
            console.log(`[Aradhya HTTP Fallback Response] +91 ${cleanMobile}:`, httpData);
            resolve({ success: true, data: httpData, gateway: "AradhyaSMS" });
          }
        });
      }).on("error", (httpErr) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutTimer);
          console.error(`[Aradhya HTTP Fallback Error] +91 ${cleanMobile}:`, httpErr.message);
          resolve({ success: false, error: httpErr.message, gateway: "AradhyaSMS" });
        }
      });
    }

    // Try HTTPS first — most hosts (Render included) allow outbound HTTPS
    // even when plain HTTP is restricted.
    const options = {
      hostname: "sms.aradhyatechnologies.in",
      port: 443,
      path,
      method: "GET",
      rejectUnauthorized: false, // provider's cert doesn't always match hostname
    };

    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutTimer);
          let parsedData = null;
          try {
            parsedData = JSON.parse(responseBody);
          } catch {
            parsedData = { raw: responseBody };
          }
          console.log(`[Aradhya SMS Gateway] HTTPS response for +91 ${cleanMobile}:`, parsedData);
          resolve({ success: true, data: parsedData, gateway: "AradhyaSMS" });
        }
      });
    });

    req.on("error", (err) => {
      console.error(`[Aradhya HTTPS Error] +91 ${cleanMobile}:`, err.message, "— falling back to HTTP.");
      if (!resolved) {
        tryHttpFallback();
      }
    });

    req.end();
  });
}

module.exports = { sendRealSMSOTP };
