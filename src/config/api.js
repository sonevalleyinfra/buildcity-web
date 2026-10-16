import { Capacitor } from "@capacitor/core";

// direct backend url (Coolify VPS); override with VITE_BACKEND_DIRECT_URL
export const BACKEND_DIRECT_URL =
  import.meta.env.VITE_BACKEND_DIRECT_URL || "https://api.buildcity.cloud";
export const PRODUCTION_WEB_URL = "https://www.buildcity.in";

// browser me relative path chalega taaki vercel reverse proxy se cors ka issue na aaye
// aur agar mobile app (apk) hai toh direct domain url use karenge
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (Capacitor.isNativePlatform()
    ? PRODUCTION_WEB_URL
    : "");

