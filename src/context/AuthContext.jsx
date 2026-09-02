import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { authFetch, saveToken, clearToken } from "../config/authFetch";

// AuthContext setup — User authentication state, Mobile OTP verification, Supabase DB sync aur role-based routing handle karta hai
const AuthContext = createContext(null);
const STORAGE_KEY = "buildcity_auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // App startup initialization — LocalStorage se logged-in user load karke Supabase Cloud DB se profile sync karein
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        // Background me Supabase Cloud DB se latest user profile sync karein (Zero PII in URL)
        authFetch(`/api/v1/users/me`)
          .then((r) => r.json())
          .then((dbUser) => {
            if (dbUser && dbUser.name) {
              const refreshed = { ...parsed, name: dbUser.name, email: dbUser.email || parsed.email };
              setUser(refreshed);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
            }
          })
          .catch(() => {});
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        clearToken();
      }
    }
    setLoading(false);
  }, []);

  const persist = (userObj) => {
    setUser(userObj);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
  };

  const getOtpEndpoint = (path) => {
    if (typeof window !== "undefined") {
      if (window.location.hostname === "localhost") {
        return `http://localhost:5000${path}`;
      }
      return `${window.location.origin}${path}`;
    }
    return path;
  };

  const [currentOtpToken, setCurrentOtpToken] = useState("");

  const requestOtp = async (phone) => {
    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);
    const endpoint = getOtpEndpoint("/api/v1/auth/otp/request");

    const response = await authFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to dispatch OTP");
    }

    if (data.otpToken) {
      setCurrentOtpToken(data.otpToken);
      try {
        sessionStorage.setItem("buildcity_otp_token", data.otpToken);
      } catch {}
    }

    return data;
  };

  const verifyOtp = async ({ phone, otp, role = "customer", name }) => {
    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);
    const cleanOtp = otp.trim();
    let storedOtpToken = currentOtpToken;
    if (!storedOtpToken) {
      try {
        storedOtpToken = sessionStorage.getItem("buildcity_otp_token") || "";
      } catch {}
    }

    // Check vendor account locally to block OTP login for vendors immediately
    let localVendor = null;
    try {
      const savedVendors = localStorage.getItem("buildcity_admin_vendors");
      const vendors = savedVendors ? JSON.parse(savedVendors) : [];
      localVendor = vendors.find((v) => (v.phone || "").trim() === cleanPhone);
    } catch {}

    if (localVendor) {
      throw new Error("Vendor accounts cannot log in using Mobile OTP. Please click 'Login as a Vendor Partner' at the bottom right!");
    }

    const endpoint = getOtpEndpoint("/api/v1/auth/otp/verify");
    const apiRes = await authFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, otp: cleanOtp, otpToken: storedOtpToken, name }),
    });

    const apiData = await apiRes.json().catch(() => ({}));
    if (!apiRes.ok || !apiData.success) {
      throw new Error(apiData.error || "Incorrect OTP. Please enter the valid code sent to your mobile number.");
    }

    const fetchedDbUser = apiData.user;
    let assignedRole = role;
    let drMatch = null;
    let vendorMatch = null;

    try {
      const savedDrs = localStorage.getItem("buildcity_admin_drs");
      const drs = savedDrs ? JSON.parse(savedDrs) : [];
      drMatch = drs.find((d) => d.phone.trim() === cleanPhone && d.status === "ACTIVE");
    } catch {
      drMatch = null;
    }

    try {
      const savedVendors = localStorage.getItem("buildcity_admin_vendors");
      const vendors = savedVendors ? JSON.parse(savedVendors) : [];
      vendorMatch = vendors.find((v) => (v.phone || "").trim() === cleanPhone || (v.user?.phone || "").trim() === cleanPhone);
    } catch {}

    if (!vendorMatch) {
      vendorMatch = localVendor;
    }

    const isStaffOrPartner =
      cleanPhone === "9999999999" ||
      cleanPhone === "7777777777" ||
      drMatch ||
      vendorMatch ||
      fetchedDbUser?.role === "ADMIN" ||
      fetchedDbUser?.role === "DR" ||
      fetchedDbUser?.role === "VENDOR";

    if (isStaffOrPartner) {
      throw new Error("Admin, DR, and Vendor accounts cannot log in using Mobile OTP. Please click 'Partner Login (Password)' at the bottom right!");
    }

    let savedCustomerName = "";
    try {
      const savedUsers = localStorage.getItem("buildcity_admin_users");
      const usersList = savedUsers ? JSON.parse(savedUsers) : [];
      const found = usersList.find((u) => (u.phone || "").trim() === cleanPhone);
      if (found && found.name && found.name !== "Customer") savedCustomerName = found.name;
    } catch {}

    const resolvedName =
      (fetchedDbUser?.name && fetchedDbUser.name !== "Customer" && !/^customer\s*\d*$/i.test(fetchedDbUser.name) ? fetchedDbUser.name : "") ||
      (name && name !== "Customer" && !/^customer\s*\d*$/i.test(name) ? name.trim() : "") ||
      (savedCustomerName && !/^customer\s*\d*$/i.test(savedCustomerName) ? savedCustomerName : "") ||
      fetchedDbUser?.name ||
      `Customer ${cleanPhone.slice(-4)}`;

    if (apiData.token) {
      saveToken(apiData.token);
    }

    const userObj = {
      id: fetchedDbUser?.id || drMatch?.id || vendorMatch?.id || "user-" + Date.now(),
      name: resolvedName,
      email: fetchedDbUser?.email || "",
      phone: cleanPhone,
      role: assignedRole,
      drInfo: drMatch || null,
      vendorInfo: vendorMatch || null,
      token: apiData.token || undefined,
    };
    persist(userObj);
    return userObj;
  };

  const updateProfile = async ({ name, email }) => {
    if (!user) return;
    const cleanName = name !== undefined ? name.trim() : user.name;
    const cleanEmail = email !== undefined ? email.trim() : user.email;

    const updatedUser = {
      ...user,
      name: cleanName,
      email: cleanEmail,
    };

    // Save Profile to local state and localStorage
    persist(updatedUser);

    // Save Profile directly to Supabase Cloud PostgreSQL DB
    try {
      await authFetch(`/api/v1/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: user.phone,
          name: cleanName,
          email: cleanEmail,
        }),
      });
      console.log("✅ Profile updated in Supabase PostgreSQL Cloud Database!");
    } catch (err) {
      console.warn("DB Profile sync note:", err.message);
    }

    return updatedUser;
  };

  const login = async ({ email, password }) => {
    await new Promise((r) => setTimeout(r, 600));
    let role = "customer";
    if (email.toLowerCase().includes("admin")) role = "admin";
    else if (email.toLowerCase().includes("vendor")) role = "vendor";

    const userObj = {
      id: "user-" + Date.now(),
      name: email.split("@")[0] || "User",
      email,
      role,
    };
    persist(userObj);
    return userObj;
  };

  const vendorLogin = async ({ phone, password }) => {
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const cleanPassword = password.trim();

    const response = await authFetch(`/api/v1/auth/vendor/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, password: cleanPassword }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Authentication failed. Incorrect Mobile or Password.");
    }

    if (data.token) {
      saveToken(data.token);
    }

    const assignedRole = (data.user?.role || "VENDOR").toLowerCase();

    const userObj = {
      ...data.user,
      role: assignedRole,
      vendorInfo: data.vendor || data.user?.vendorInfo,
      token: data.token,
    };

    persist(userObj);
    return userObj;
  };

  const logout = () => {
    setUser(null);
    clearToken();
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        requestOtp,
        verifyOtp,
        vendorLogin,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}