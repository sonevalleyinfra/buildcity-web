const https = require("https");
const http = require("http");

/**
 * BuildCity Aradhya Technologies SMS Gateway Module (High-Speed Direct Gateway with KeepAlive Pool)
 */
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50, timeout: 5000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, timeout: 5000, rejectUnauthorized: false });

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

  const message = `Dear user, Thankyou for visiting Sonevalley. Your OTP for login is ${otpCode}. Please do not share this OTP with anyone.\nRegards SNVLY`;

  const queryParams = [
    `username=${encodeURIComponent(currentUsername)}`,
    `apikey=${encodeURIComponent(currentApikey)}`,
    `apirequest=Text`,
    `sender=${encodeURIComponent(sender)}`,
    `mobile=${encodeURIComponent(cleanMobile)}`,
    `message=${encodeURIComponent(message)}`,
    `route=${encodeURIComponent(route)}`,
    `TemplateID=${encodeURIComponent(templateId)}`,
    `peid=${encodeURIComponent(peid)}`,
    `format=JSON`,
  ].join("&");

  const path = `/sms-panel/api/http/index.php?${queryParams}`;

  // Helper for direct HTTP / HTTPS requests with 4s timeout
  const makeDirectRequest = (isHttps) => {
    return new Promise((resolve, reject) => {
      const client = isHttps ? https : http;
      const agent = isHttps ? httpsAgent : httpAgent;
      const port = isHttps ? 443 : 80;

      const req = client.request(
        {
          hostname: "sms.aradhyatechnologies.in",
          port,
          path,
          method: "GET",
          agent,
          timeout: 4500,
          headers: {
            "User-Agent": "BuildCity-Core/2.0",
            "Accept": "*/*",
            "Connection": "keep-alive",
          },
        },
        (res) => {
          let body = "";
          res.on("data", (c) => { body += c; });
          res.on("end", () => {
            let parsed = null;
            try { parsed = JSON.parse(body); } catch { parsed = { raw: body }; }
            const isSuccess =
              res.statusCode >= 200 &&
              res.statusCode < 300 &&
              (parsed?.status === "success" ||
                parsed?.status === "000" ||
                (typeof body === "string" && body.toLowerCase().includes("successfully")));
            resolve({
              success: isSuccess,
              status: res.statusCode,
              body,
              data: parsed,
            });
          });
        }
      );

      req.on("timeout", () => {
        req.destroy(new Error("Direct gateway timeout"));
      });
      req.on("error", reject);
      req.end();
    });
  };

  // Ultra-Fast Parallel Race: Send via Edge Relay & Direct Gateway simultaneously (<500ms)
  const relayPromise = (async () => {
    try {
      const edgeRes = await fetch(`https://buildcity-web-part-2.vercel.app/api/sms?${queryParams}`, {
        method: "GET",
        headers: { "User-Agent": "BuildCity-Core/2.0", "Accept": "*/*" },
        signal: AbortSignal.timeout(4000),
      });
      const edgeText = await edgeRes.text();
      let edgeData = null;
      try { edgeData = JSON.parse(edgeText); } catch { edgeData = { raw: edgeText }; }

      const isSuccess =
        edgeRes.ok &&
        (edgeData?.status === "success" ||
          edgeData?.status === "000" ||
          (typeof edgeText === "string" && edgeText.toLowerCase().includes("successfully")));

      if (isSuccess) {
        console.log(`[SMS Fast Relay] Delivered | HTTP ${edgeRes.status}`);
        return { success: true, status: edgeRes.status, message: edgeData?.message || edgeText, data: edgeData, gateway: "AradhyaSMS" };
      }
      throw new Error(edgeText || "Relay non-success");
    } catch (e) {
      throw e;
    }
  })();

  const directHttpPromise = (async () => {
    try {
      const direct = await makeDirectRequest(false);
      if (direct.success) {
        console.log(`[SMS Direct HTTP] Delivered | HTTP ${direct.status}`);
        return { success: true, status: direct.status, message: direct.data?.message || direct.body, data: direct.data, gateway: "AradhyaSMS" };
      }
      throw new Error(direct.body || "Direct non-success");
    } catch (e) {
      throw e;
    }
  })();

  try {
    const fastestResult = await Promise.any([relayPromise, directHttpPromise]);
    return fastestResult;
  } catch {
    // If both initial fast methods failed, try HTTPS fallback
    try {
      const httpsDirect = await makeDirectRequest(true);
      return {
        success: httpsDirect.success,
        status: httpsDirect.status,
        message: httpsDirect.data?.message || httpsDirect.body,
        data: httpsDirect.data,
        gateway: "AradhyaSMS",
      };
    } catch (finalErr) {
      console.warn("[SMS Fallback Notice]:", finalErr.message);
      return { success: false, error: "SMS dispatch finished", gateway: "AradhyaSMS" };
    }
  }
}

module.exports = { sendRealSMSOTP };
