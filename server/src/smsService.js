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

  console.log(`[Aradhya SMS Gateway] GET Dispatching OTP ${otpCode} to +91 ${cleanMobile}...`);

  return new Promise((resolve) => {
    let resolved = false;

    // Timeout safety (12s) so Aradhya Gateway has full time to respond
    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`[Aradhya SMS Gateway] Timeout safety triggered after 12s for +91 ${cleanMobile}`);
        resolve({ success: false, warning: "Timeout background dispatch", gateway: "AradhyaSMS" });
      }
    }, 12000);

    const path = `/sms-panel/api/http/index.php?${queryParams}`;

    const options = {
      hostname: "sms.aradhyatechnologies.in",
      port: 443,
      path: path,
      method: "GET",
      rejectUnauthorized: false,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Connection": "close"
      }
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
          console.log(`[Aradhya SMS Gateway] HTTPS Response for +91 ${cleanMobile}:`, parsedData);
          resolve({ success: true, data: parsedData, gateway: "AradhyaSMS" });
        }
      });
    });

    req.on("error", (err) => {
      console.error(`[Aradhya HTTPS Error] +91 ${cleanMobile}:`, err.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        resolve({ success: false, error: err.message, gateway: "AradhyaSMS" });
      }
    });

    req.end();
  });
}

module.exports = { sendRealSMSOTP };
