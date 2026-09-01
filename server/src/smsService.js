const https = require("https");
const http = require("http");

/**
 * BuildCity Aradhya Technologies SMS Gateway Module
 * Dispatches 6-digit OTP SMS via Aradhya Technologies HTTP/HTTPS API
 */
async function sendRealSMSOTP(phone, otpCode) {
  const cleanMobile = (phone || "").toString().trim().replace(/\D/g, "").slice(-10);
  
  const username = process.env.SMS_USERNAME || process.env.ARADHYA_SMS_USERNAME || "sonevalley";
  const apikey = process.env.SMS_APIKEY || process.env.ARADHYA_SMS_APIKEY || "0A8CC-B46EE";
  const sender = process.env.SMS_SENDER || process.env.ARADHYA_SMS_SENDER || "SNVLY";
  const templateId = process.env.SMS_TEMPLATE_ID || process.env.ARADHYA_SMS_TEMPLATE_ID || "1707175298595096991";
  const peid = process.env.SMS_PEID || process.env.ARADHYA_SMS_PE_ID || "1701175266640135857";
  const route = process.env.SMS_ROUTE || process.env.ARADHYA_SMS_ROUTE || "TRANS";
  const timeoutMs = parseInt(process.env.SMS_TIMEOUT_MS || "15000", 10);

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

  const path = `/sms-panel/api/http/index.php?${queryParams}`;

  return new Promise((resolve) => {
    let resolved = false;

    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`[SMS] Gateway timeout after ${timeoutMs}ms for +91 ${cleanMobile}`);
        resolve({
          success: false,
          error: `SMS Gateway timeout after ${timeoutMs}ms`,
          gateway: "AradhyaSMS"
        });
      }
    }, timeoutMs);

    const options = {
      hostname: "sms.aradhyatechnologies.in",
      port: 80,
      family: 4,
      path: path,
      method: "GET"
    };

    const req = http.request(options, (res) => {
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

          const isSuccess =
            res.statusCode >= 200 &&
            res.statusCode < 300 &&
            (parsedData?.status === "success" ||
              parsedData?.status === "000" ||
              (typeof responseBody === "string" && responseBody.toLowerCase().includes("successfully")));

          console.log(`[SMS] HTTP ${res.statusCode} | ok=${isSuccess} | body:`, responseBody);

          resolve({
            success: isSuccess,
            status: res.statusCode,
            message: parsedData?.message || responseBody,
            data: parsedData,
            raw: responseBody,
            gateway: "AradhyaSMS"
          });
        }
      });
    });

    req.on("error", (err) => {
      console.error(`[SMS HTTPS Error] +91 ${cleanMobile}:`, err.message);
      // HTTP fallback
      http.get(`http://sms.aradhyatechnologies.in${path}`, (httpRes) => {
        let httpData = "";
        httpRes.on("data", (chunk) => { httpData += chunk; });
        httpRes.on("end", () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutTimer);
            let parsed = null;
            try { parsed = JSON.parse(httpData); } catch { parsed = { raw: httpData }; }

            const isSuccess =
              httpRes.statusCode >= 200 &&
              httpRes.statusCode < 300 &&
              (parsed?.status === "success" ||
                parsed?.status === "000" ||
                (typeof httpData === "string" && httpData.toLowerCase().includes("successfully")));

            console.log(`[SMS HTTP Fallback] HTTP ${httpRes.statusCode} | ok=${isSuccess} | body:`, httpData);

            resolve({
              success: isSuccess,
              status: httpRes.statusCode,
              message: parsed?.message || httpData,
              data: parsed,
              raw: httpData,
              gateway: "AradhyaSMS"
            });
          }
        });
      }).on("error", (httpErr) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutTimer);
          console.error(`[SMS HTTP Fallback Error]:`, httpErr.message);
          resolve({
            success: false,
            error: httpErr.message,
            gateway: "AradhyaSMS"
          });
        }
      });
    });

    req.end();
  });
}

module.exports = { sendRealSMSOTP };
