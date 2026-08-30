// Centralized Production REST API Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes("localhost")
    ? import.meta.env.VITE_API_URL
    : "https://buildcity-web.onrender.com";
