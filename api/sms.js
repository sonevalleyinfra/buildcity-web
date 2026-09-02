import https from "https";
import http from "http";

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
      const port = isHttps ? 443 : 80;
      return new Promise((resolve, reject) => {
        const options = {
          hostname: "sms.aradhyatechnologies.in",
          port,
          path,
          method: "GET",
          rejectUnauthorized: false,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Connection": "close",
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

        r.setTimeout(6000, () => {
          r.destroy(new Error("Request timeout"));
        });

        r.on("error", reject);
        r.end();
      });
    };

    let result;
    try {
      result = await makeRequest(true);
    } catch (e) {
      result = await makeRequest(false);
    }

    return res.status(result.status || 200).json(result.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
