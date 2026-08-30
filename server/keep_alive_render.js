const https = require('https');

function pingRender() {
  https.get('https://buildcity-web.onrender.com/api/v1/cloud-sync', (res) => {
    console.log(`[Keep-Alive Ping ${new Date().toLocaleTimeString()}] Status:`, res.statusCode);
  }).on('error', (err) => {
    console.warn(`[Keep-Alive Error]:`, err.message);
  });
}

// Initial ping
pingRender();

// Keep Render backend awake by pinging every 2 minutes
setInterval(pingRender, 2 * 60 * 1000);
