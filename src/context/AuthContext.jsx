import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "buildcity_auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const persist = (userObj) => {
    setUser(userObj);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
  };

  // TEMPORARY MOCK — replace with POST /api/v1/auth/otp/request once backend exists
  const requestOtp = async (phone) => {
    await new Promise((r) => setTimeout(r, 600));
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] OTP for ${phone}: 123456 (any code works in dev)`);
    }
    return true;
  };

  // TEMPORARY MOCK — replace with POST /api/v1/auth/otp/verify once backend exists.
  // Dev-only: role comes from an explicit selector on the login screen so all
  // three roles (customer/vendor/admin) can be tested without a real backend.
  const verifyOtp = async ({ phone, otp, role = "customer", name }) => {
    await new Promise((r) => setTimeout(r, 600));

    const cleanPhone = phone.trim();
    let assignedRole = role;
    let drMatch = null;
    let vendorMatch = null;

    // 1. Check if phone is an assigned active DR
    try {
      const savedDrs = localStorage.getItem("buildcity_admin_drs");
      const drs = savedDrs ? JSON.parse(savedDrs) : [];
      drMatch = drs.find((d) => d.phone.trim() === cleanPhone && d.status === "ACTIVE");
    } catch {
      drMatch = null;
    }

    // 2. Check if phone belongs to a registered Vendor
    try {
      const savedVendors = localStorage.getItem("buildcity_admin_vendors");
      const vendors = savedVendors ? JSON.parse(savedVendors) : [];
      vendorMatch = vendors.find((v) => v.phone.trim() === cleanPhone);
    } catch {
      vendorMatch = null;
    }

    // Evaluate Role & Status
    if (cleanPhone === "9999999999" || cleanPhone === "0000000000") {
      assignedRole = "admin";
    } else if (drMatch) {
      assignedRole = "dr";
    } else if (vendorMatch) {
      if (vendorMatch.status === "PENDING") {
        throw new Error("Your vendor account is pending approval by DR or Admin.");
      }
      if (vendorMatch.status === "SUSPENDED") {
        throw new Error("Your vendor account has been suspended. Contact support.");
      }
      if (vendorMatch.status === "APPROVED") {
        assignedRole = "vendor";
      }
    } else if (cleanPhone === "8888888888") {
      assignedRole = "vendor";
    }

    const defaultName =
      assignedRole === "admin"
        ? "Admin User"
        : assignedRole === "dr"
        ? drMatch?.name || "District Representative"
        : assignedRole === "vendor"
        ? vendorMatch?.shopName || "Vendor Partner"
        : `Customer ${cleanPhone.slice(-4)}`;

    const userObj = {
      id: drMatch?.id || vendorMatch?.id || "mock-" + Date.now(),
      name: name || defaultName,
      phone: cleanPhone,
      role: assignedRole,
      drInfo: drMatch || null,
      vendorInfo: vendorMatch || null,
    };
    persist(userObj);
    return userObj;
  };

  // TEMPORARY MOCK — replace body with a real
  // POST /api/v1/auth/login call once the backend exists.
  // Dev shortcut: email containing "vendor" or "admin" logs in
  // with that role, so you can preview all three dashboards
  // before the backend assigns real roles.
  const login = async ({ email, password }) => {
    await new Promise((r) => setTimeout(r, 600));
    let role = "customer";
    if (email.toLowerCase().includes("admin")) role = "admin";
    else if (email.toLowerCase().includes("vendor")) role = "vendor";

    const userObj = {
      id: "mock-" + Date.now(),
      name: email.split("@")[0] || "User",
      email,
      role,
    };
    persist(userObj);
    return userObj;
  };

  // TEMPORARY MOCK — replace with POST /api/v1/auth/register
  const register = async ({ name, email }) => {
    await new Promise((r) => setTimeout(r, 600));
    const userObj = {
      id: "mock-" + Date.now(),
      name: name || email.split("@")[0],
      email,
      role: "customer",
    };
    persist(userObj);
    return userObj;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // TEMPORARY MOCK — replace with PUT /api/v1/users/me once backend exists
  const updateProfile = (updates) => {
    const updated = { ...user, ...updates };
    persist(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateProfile, requestOtp, verifyOtp }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}