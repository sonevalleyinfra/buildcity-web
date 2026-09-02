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

    const targetUrl = `https://sms.aradhyatechnologies.in/sms-panel/api/http/index.php?${queryString}`;
    
    const gatewayRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
      },
    });

    const bodyText = await gatewayRes.text();
    let parsed = null;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = { raw: bodyText };
    }

    return res.status(gatewayRes.status).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
