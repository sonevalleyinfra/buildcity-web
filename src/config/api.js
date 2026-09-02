const isBrowser = typeof window !== "undefined";
const isLocalhost = isBrowser && (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.endsWith(".local")
);

export const API_BASE_URL = isLocalhost
  ? "http://localhost:5000"
  : "https://buildcity-web.onrender.com";

