import { Capacitor } from "@capacitor/core";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
   !Capacitor.isNativePlatform() &&
   import.meta.env.VITE_APP_MODE !== "vendor" &&
   (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000"
    : "https://buildcity-web.onrender.com");

