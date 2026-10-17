import { Capacitor } from "@capacitor/core";

// __BC_TARGET__ is set at build time by vite.config.js (production | staging).
// Ternary (not a lookup) so the unused row is dropped from the bundle.
const TARGET =
  __BC_TARGET__ === "production"
    ? { webUrl: "https://www.buildcity.in", apiDirectUrl: "https://api.buildcity.cloud" }
    : { webUrl: "https://staging.buildcity.in", apiDirectUrl: "https://api-staging.buildcity.cloud" };

// direct backend url; override with VITE_BACKEND_DIRECT_URL (build rejects hosts of the other target)
export const BACKEND_DIRECT_URL = import.meta.env.VITE_BACKEND_DIRECT_URL || TARGET.apiDirectUrl;
export const WEB_URL = TARGET.webUrl;

// browser me relative path chalega taaki vercel reverse proxy se cors ka issue na aaye
// aur agar mobile app (apk) hai toh direct domain url use karenge
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (Capacitor.isNativePlatform()
    ? WEB_URL
    : "");
