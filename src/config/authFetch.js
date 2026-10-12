import { API_BASE_URL, RAILWAY_API_URL, PRODUCTION_WEB_URL } from "./api";
import { Capacitor } from "@capacitor/core";

const TOKEN_KEY = "buildcity_token";
const AUTH_KEY = "buildcity_auth";

/**
 * Saves authenticated JWT to localStorage
 */
export const saveToken = (token) => {
  if (token && typeof token === "string") {
    try {
      localStorage.setItem(TOKEN_KEY, token.trim());
    } catch {}
  }
};

/**
 * Retrieves current JWT from localStorage
 */
export const getToken = () => {
  try {
    const direct = localStorage.getItem(TOKEN_KEY);
    if (direct && direct.trim()) return direct.trim();
    const auth = localStorage.getItem(AUTH_KEY);
    if (auth) {
      const parsed = JSON.parse(auth);
      if (parsed?.token && typeof parsed.token === "string" && parsed.token.trim()) {
        const clean = parsed.token.trim();
        try {
          localStorage.setItem(TOKEN_KEY, clean);
        } catch {}
        return clean;
      }
    }
    return "";
  } catch {
    return "";
  }
};

/**
 * Removes JWT from localStorage
 */
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

/**
 * Authenticated Fetch Wrapper:
 * - Automatically prefixes API_BASE_URL for relative paths
 * - Automatically routes through Vercel edge reverse-proxy on web
 * - Implements dual-gateway fallback (Vercel Proxy <-> Railway) on network/DNS drops
 * - Automatically injects Authorization: Bearer <token>
 * - Default Content-Type: application/json (unless FormData)
 * - Handles 401 Unauthorized by retrying direct Railway gateway (in case proxy/redirect stripped Authorization header) and syncing AuthContext state if genuinely expired
 */
export const authFetch = async (path, options = {}) => {
  let primaryUrl = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  // In web browsers, if primaryUrl was explicitly prefixed with Railway domain,
  // normalize it to relative /api/v1/... so it routes through Vercel edge reverse proxy.
  if (
    typeof window !== "undefined" &&
    !Capacitor.isNativePlatform() &&
    primaryUrl.includes("buildcity-web-production-a5ca.up.railway.app")
  ) {
    primaryUrl = primaryUrl.replace("https://buildcity-web-production-a5ca.up.railway.app", "");
    if (!primaryUrl.startsWith("/")) primaryUrl = `/${primaryUrl}`;
  }

  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // If body is not FormData and Content-Type is not explicitly set, set application/json
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(primaryUrl, {
      ...options,
      headers,
    });
  } catch (primaryErr) {
    // If primary URL failed (e.g. Failed to fetch due to DNS/network drop),
    // attempt automatic failover to the secondary gateway!
    let fallbackUrl = null;
    if (primaryUrl.startsWith("/")) {
      fallbackUrl = `${RAILWAY_API_URL}${primaryUrl}`;
    } else if (primaryUrl.includes("buildcity-web-production-a5ca.up.railway.app")) {
      fallbackUrl = primaryUrl.replace(RAILWAY_API_URL, PRODUCTION_WEB_URL);
    } else if (primaryUrl.includes("buildcity.in")) {
      fallbackUrl = primaryUrl.replace(PRODUCTION_WEB_URL, RAILWAY_API_URL);
    }

    if (fallbackUrl && fallbackUrl !== primaryUrl) {
      try {
        response = await fetch(fallbackUrl, {
          ...options,
          headers,
        });
      } catch (fallbackErr) {
        throw new Error("Unable to connect to BuildCity servers. Please check your internet connection or try again.");
      }
    } else {
      throw new Error("Unable to connect to BuildCity servers. Please check your internet connection or try again.");
    }
  }

  // If 401 occurs even though we had a token, a domain redirect (e.g. www.buildcity.in <-> buildcity.in on APK/Web)
  // may have stripped the Authorization header. Retry directly against Railway backend once before declaring token invalid.
  if (
    response.status === 401 &&
    token &&
    typeof window !== "undefined" &&
    !window.location.hostname.includes("localhost") &&
    !primaryUrl.includes("buildcity-web-production-a5ca.up.railway.app")
  ) {
    const apiPath = primaryUrl.startsWith("http")
      ? primaryUrl.replace(/^https?:\/\/[^/]+/, "")
      : primaryUrl;
    const directRailwayUrl = `${RAILWAY_API_URL}${apiPath.startsWith("/") ? "" : "/"}${apiPath}`;
    try {
      const retryRes = await fetch(directRailwayUrl, {
        ...options,
        headers,
      });
      if (retryRes.status !== 401) {
        return retryRes;
      }
      response = retryRes;
    } catch {}
  }

  // If 401 Unauthorized still occurs, sync logout state cleanly so the user is not stuck in a "ghost login" state
  if (response.status === 401 && token) {
    clearToken();
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("buildcity_auth_expired"));
    }

    // Only force redirect if actively inside a protected partner dashboard route
    if (
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/admin") ||
       window.location.pathname.startsWith("/vendor") ||
       window.location.pathname.startsWith("/dr"))
    ) {
      window.location.href = window.location.pathname.startsWith("/vendor") ? "/vendor/login" : "/login";
    }
  }

  return response;
};
