const https = require("https");
const http = require("http");

/**
 * BuildCity Aradhya Technologies SMS Gateway Module
 * Dispatches 6-digit OTP SMS via Aradhya Technologies HTTP/HTTPS API
 */
const username = process.env.SMS_USERNAME || process.env.ARADHYA_SMS_USERNAME;
const apikey = process.env.SMS_APIKEY || process.env.ARADHYA_SMS_APIKEY;

if (!username || !apikey) {
  throw new Error("Missing required SMS gateway credentials: SMS_USERNAME and SMS_APIKEY must be set in environment variables.");
}

async function sendRealSMSOTP(phone, otpCode) {
  const cleanMobile = (phone || "").toString().trim().replace(/\D/g, "").slice(-10);

  const currentUsername = (process.env.SMS_USERNAME || process.env.ARADHYA_SMS_USERNAME || "").trim();
  const currentApikey = (process.env.SMS_APIKEY || process.env.ARADHYA_SMS_APIKEY || "").trim();
  const sender = (process.env.SMS_SENDER || process.env.ARADHYA_SMS_SENDER || "").trim();
  const templateId = (process.env.SMS_TEMPLATE_ID || process.env.ARADHYA_SMS_TEMPLATE_ID || "").trim();
  const peid = (process.env.SMS_PEID || process.env.ARADHYA_SMS_PE_ID || "").trim();
  const route = (process.env.SMS_ROUTE || process.env.ARADHYA_SMS_ROUTE || "TRANS").trim().toUpperCase();

  const message = `Dear user, Thankyou for visiting Sonevalley. Your OTP for login is ${otpCode}. Please do not share this OTP with anyone. Regards SNVLY`;

  const queryParams = new URLSearchParams({
    username: currentUsername,
    apikey: currentApikey,
    apirequest: "Text",
    sender,
    mobile: cleanMobile,
    message,
    route,
    TemplateID: templateId,
    peid,
    format: "JSON"
  }).toString();

  // 1. First Priority: High-speed Indian Mumbai Edge Relay (50ms response, zero cloud IP drop)
  try {
    const edgeRes = await fetch(`https://buildcity-web-part-2.vercel.app/api/sms?${queryParams}`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
      },
    });

    const edgeText = await edgeRes.text();
    let edgeData = null;
    try {
      edgeData = JSON.parse(edgeText);
    } catch {
      edgeData = { raw: edgeText };
    }

    const isSuccess =
      edgeRes.ok &&
      (edgeData?.status === "success" ||
        edgeData?.status === "000" ||
        (typeof edgeText === "string" && edgeText.toLowerCase().includes("successfully")));

    console.log(`[SMS Gateway] HTTP ${edgeRes.status} | ok=${isSuccess} | body:`, edgeText);

    if (isSuccess || edgeData?.status === "error") {
      return {
        success: isSuccess,
        status: edgeRes.status,
        message: edgeData?.message || edgeText,
        data: edgeData,
        raw: edgeText,
        gateway: "AradhyaSMS"
      };
    }
  } catch (edgeErr) {
    console.warn("[SMS Gateway Notice]: Mumbai edge relay note:", edgeErr.message);
  }

  // 2. Direct Fallback via HTTPS / HTTP
  const path = `/sms-panel/api/http/index.php?${queryParams}`;

  return new Promise((resolve) => {
    let resolved = false;

    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`[SMS] Gateway timeout after 10000ms for +91 ${cleanMobile}`);
        resolve({
          success: false,
          error: "SMS Gateway timeout",
          gateway: "AradhyaSMS"
        });
      }
    }, 10000);

    const options = {
      hostname: "sms.aradhyatechnologies.in",
      port: 443,
      path: path,
      method: "GET",
      rejectUnauthorized: false,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Connection": "close",
      },
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

          const isSuccess =
            res.statusCode >= 200 &&
            res.statusCode < 300 &&
            (parsedData?.status === "success" ||
              parsedData?.status === "000" ||
              (typeof responseBody === "string" && responseBody.toLowerCase().includes("successfully")));

          console.log(`[SMS Direct] HTTP ${res.statusCode} | ok=${isSuccess} | body:`, responseBody);

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

    req.setTimeout(4000, () => {
      req.destroy(new Error("HTTPS timeout"));
    });

    req.on("error", () => {
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
