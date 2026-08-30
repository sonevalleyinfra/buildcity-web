const http = require("http");

/**
 * BuildCity Aradhya Technologies SMS Gateway Module
 * Dispatches 6-digit OTP SMS via Aradhya Technologies HTTP API (Port 80)
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

  console.log(`[Aradhya SMS Gateway] HTTP GET Dispatching OTP ${otpCode} to +91 ${cleanMobile}...`);

  return new Promise((resolve) => {
    let resolved = false;

    // Timeout safety (8s) so UI response never hangs
    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`[Aradhya SMS Gateway] HTTP Timeout safety triggered after 8s for +91 ${cleanMobile}`);
        resolve({ success: false, warning: "timeout", gateway: "AradhyaSMS" });
      }
    }, 8000);

    const path = `/sms-panel/api/http/index.php?${queryParams}`;

    const req = http.get(`http://sms.aradhyatechnologies.in${path}`, (res) => {
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
          console.log(`[Aradhya SMS Gateway] HTTP Response for +91 ${cleanMobile}:`, parsedData);
          resolve({ success: true, data: parsedData, gateway: "AradhyaSMS" });
        }
      });
    });

    req.on("error", (err) => {
      console.error(`[Aradhya HTTP Error] +91 ${cleanMobile}:`, err.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        resolve({ success: false, error: err.message, gateway: "AradhyaSMS" });
      }
    });
  });
}

module.exports = { sendRealSMSOTP };
