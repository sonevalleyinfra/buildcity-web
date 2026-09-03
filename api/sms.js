import https from "https";
import http from "http";

const httpAgent = new http.Agent({ keepAlive: true, timeout: 8000 });
const httpsAgent = new https.Agent({ keepAlive: true, timeout: 8000, rejectUnauthorized: false });

export default async function handler(req, res) {
  // CORS & Methods
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const rawUrl = req.url || "";
    const queryIdx = rawUrl.indexOf("?");
    const queryString = queryIdx !== -1 ? rawUrl.slice(queryIdx + 1) : "";
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
    return res.status(500).json({ error: err.message });
  }
}
