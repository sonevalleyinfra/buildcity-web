import { API_BASE_URL } from "./api";

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
    return localStorage.getItem(TOKEN_KEY) || "";
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
 * - Automatically injects Authorization: Bearer <token>
 * - Default Content-Type: application/json (unless FormData)
 * - Handles 401 Unauthorized by clearing session and redirecting to /login
 */
export const authFetch = async (path, options = {}) => {
  const url = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

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

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If 401 Unauthorized occurs on a protected resource, clear tokens and redirect to login
  if (response.status === 401) {
    clearToken();
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {}

    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/auth")
    ) {
      window.location.href = "/login";
    }
  }

  return response;
};
