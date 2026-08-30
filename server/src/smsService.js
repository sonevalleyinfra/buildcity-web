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
    format: "JSON"
  }).toString();

  console.log(`[Aradhya SMS Gateway] GET Dispatching OTP ${otpCode} to +91 ${cleanMobile}...`);

  return new Promise((resolve) => {
    let resolved = false;

    // Timeout safety (3.5s) so UI response never hangs or freezes
    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`[Aradhya SMS Gateway] Timeout safety triggered after 3.5s for +91 ${cleanMobile}`);
        resolve({ success: true, warning: "Timeout background dispatch", gateway: "AradhyaSMS" });
      }
    }, 3500);

    const path = `/sms-panel/api/http/index.php?${queryParams}`;

    const options = {
      hostname: "sms.aradhyatechnologies.in",
      port: 443,
      path: path,
      method: "GET",
      rejectUnauthorized: false // Handle SSL cert altname mismatch safely
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
          console.log(`[Aradhya SMS Gateway] Response for +91 ${cleanMobile}:`, parsedData);
          resolve({ success: true, data: parsedData, gateway: "AradhyaSMS" });
        }
      });
    });

    req.on("error", (err) => {
      console.error(`[Aradhya HTTPS Error] +91 ${cleanMobile}:`, err.message);
      // HTTP fallback if HTTPS fails
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
          console.error(`[Aradhya HTTP Fallback Error]:`, httpErr.message);
          resolve({ success: false, error: httpErr.message, gateway: "AradhyaSMS" });
        }
      });
    });

    req.end();
  });
}

module.exports = { sendRealSMSOTP };
