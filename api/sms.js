import https from "https";
import http from "http";

const httpAgent = new http.Agent({ keepAlive: true, timeout: 8000 });
const httpsAgent = new https.Agent({ keepAlive: true, timeout: 8000, rejectUnauthorized: false });

// Server-to-server relay for the backend's OTP SMS. Browsers never call it, so no CORS headers.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // When SMS_RELAY_SECRET is configured, only the backend (which sends the same secret) may use the relay
  const relaySecret = process.env.SMS_RELAY_SECRET;
  if (relaySecret && req.headers["x-relay-secret"] !== relaySecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const rawUrl = req.url || "";
    const queryIdx = rawUrl.indexOf("?");
    const queryString = queryIdx !== -1 ? rawUrl.slice(queryIdx + 1) : "";

    // Only relay single-recipient text SMS requests
    const params = new URLSearchParams(queryString);
    if (params.get("apirequest") !== "Text" || !/^\d{10}$/.test(params.get("mobile") || "")) {
      return res.status(400).json({ error: "Invalid SMS request" });
    }

    const path = `/sms-panel/api/http/index.php?${queryString}`;

    const makeRequest = (isHttps) => {
      const client = isHttps ? https : http;
      const agent = isHttps ? httpsAgent : httpAgent;
      const port = isHttps ? 443 : 80;

      return new Promise((resolve, reject) => {
        const options = {
          hostname: "sms.aradhyatechnologies.in",
          port,
          path,
          method: "GET",
          agent,
          headers: {
            "User-Agent": "BuildCity-Edge/2.0",
            "Accept": "*/*",
            "Connection": "keep-alive",
          },
        };

        const r = client.request(options, (response) => {
          let data = "";
          response.on("data", (chunk) => { data += chunk; });
          response.on("end", () => {
            let parsed = null;
            try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }
            resolve({ status: response.statusCode, data: parsed });
          });
        });

        r.setTimeout(8000, () => {
          r.destroy(new Error("Request timeout"));
        });

        r.on("error", reject);
        r.end();
      });
    };

    let result;
    try {
      result = await makeRequest(false);
    } catch (e) {
      result = await makeRequest(true);
    }

    return res.status(result.status || 200).json(result.data);
  } catch (err) {
    console.error("SMS relay error:", err);
    return res.status(502).json({ error: "SMS gateway unreachable" });
  }
}
