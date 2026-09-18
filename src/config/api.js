import { Capacitor } from "@capacitor/core";

// Primary Railway Backend & Production Custom Domain
export const RAILWAY_API_URL = "https://buildcity-web-production-a5ca.up.railway.app";
export const PRODUCTION_WEB_URL = "https://www.buildcity.in";

// In web browsers (desktop, laptop, mobile web):
// Empty string "" makes all requests relative to the current origin (e.g. https://www.buildcity.in/api/v1/...).
// Vercel edge reverse-proxy transparently forwards /api/v1 to Railway backend.
// This completely resolves CORS blocks and router-level DNS refusal of .up.railway.app.
//
// In native Android/iOS APK (Capacitor):
// It must use an absolute URL pointing to the primary verified domain (https://www.buildcity.in).
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (Capacitor.isNativePlatform()
    ? PRODUCTION_WEB_URL
    : "");

