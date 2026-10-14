import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { authFetch, saveToken, getToken, clearToken } from "../config/authFetch";
import { unregisterVendorPushNotifications } from "../utils/pushNotifications";

// ye auth context hai, yaha user ka login status, otp verification aur supabase sync sab manage hota hai
const AuthContext = createContext(null);
const STORAGE_KEY = "buildcity_auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const activeToken = getToken() || parsed?.token || "";
        if (parsed && (parsed.id || parsed.phone) && activeToken) {
          saveToken(activeToken);
          return { ...parsed, token: activeToken };
        }
        // Agar user object hai par JWT token gayab hai (ghost login), toh clean kar do
        localStorage.removeItem(STORAGE_KEY);
        clearToken();
      }
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(false);

  // jab app start hota hai toh background me supabase se latest user profile aur sliding token sync kar dete hai
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      clearToken();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    };

    window.addEventListener("buildcity_auth_expired", handleAuthExpired);

    const saved = localStorage.getItem(STORAGE_KEY);
    const activeToken = getToken();
    if (saved && activeToken) {
      try {
        const parsed = JSON.parse(saved);
        // background me user ki details fetch karke local storage aur token validity (15 days sliding) update karte hai
        authFetch(`/api/v1/users/me`)
          .then(async (r) => {
            if (r.status === 401) {
              handleAuthExpired();
              return null;
            }
            if (!r.ok) return null;
            const data = await r.json().catch(() => null);
            return data;
          })
          .then((dbUser) => {
            if (dbUser && (dbUser.id || dbUser.name)) {
              const freshToken = dbUser.token || parsed.token || getToken();
              if (freshToken) {
                saveToken(freshToken);
              }
              const resolvedVendorInfo = dbUser.vendorInfo || parsed.vendorInfo || null;
              const resolvedDrInfo = dbUser.drInfo || parsed.drInfo || null;
              const resolvedRole = (
                resolvedVendorInfo || parsed.role?.toLowerCase() === "vendor" || dbUser.role?.toLowerCase() === "vendor"
                  ? "vendor"
                  : resolvedDrInfo || parsed.role?.toLowerCase() === "dr" || dbUser.role?.toLowerCase() === "dr"
                  ? "dr"
                  : parsed.role?.toLowerCase() === "admin" || dbUser.role?.toLowerCase() === "admin"
                  ? "admin"
                  : dbUser.role || parsed.role || "customer"
              ).toLowerCase();

              const refreshed = {
                ...parsed,
                id: dbUser.id || parsed.id,
                name: dbUser.name || parsed.name,
                email: dbUser.email || parsed.email,
                role: resolvedRole,
                drInfo: resolvedDrInfo,
                vendorInfo: resolvedVendorInfo,
                regionId: dbUser.regionId || parsed.regionId,
                regionName: dbUser.regionName || parsed.regionName,
                preferredRegionId: dbUser.preferredRegionId || parsed.preferredRegionId,
                preferredRegionName: dbUser.preferredRegionName || parsed.preferredRegionName,
                referralCode: dbUser.referralCode || parsed.referralCode || null,
                walletBalance: dbUser.walletBalance !== undefined ? Number(dbUser.walletBalance) : (parsed.walletBalance || 0),
                token: freshToken,
              };
              setUser(refreshed);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));

              // agar user ka koi preferred region database me set hai toh automatically switch karwa dete hai
              if (dbUser.preferredRegionId || dbUser.preferredRegionName) {
                window.dispatchEvent(
                  new CustomEvent("buildcity_user_preferred_region", {
                    detail: {
                      regionId: dbUser.preferredRegionId,
                      regionName: dbUser.preferredRegionName,
                    },
                  })
                );
              }
            }
          })
          .catch(() => {});
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        clearToken();
      }
    }
    setLoading(false);

    return () => {
      window.removeEventListener("buildcity_auth_expired", handleAuthExpired);
    };
  }, []);

  const persist = (userObj) => {
    const activeToken = userObj?.token || getToken();
    const withToken = activeToken ? { ...userObj, token: activeToken } : userObj;
    if (activeToken) {
      saveToken(activeToken);
    }
    setUser(withToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withToken));
  };

  const getOtpEndpoint = (path) => {
    return path;
  };

  const [currentOtpToken, setCurrentOtpToken] = useState("");

  const requestOtp = async (phone, type = "login") => {
    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);
    const endpoint = getOtpEndpoint("/api/v1/auth/otp/request");

    const response = await authFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, type }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      const err = new Error(data.error || "Failed to dispatch OTP");
      err.notRegistered = data.notRegistered;
      err.alreadyRegistered = data.alreadyRegistered;
      throw err;
    }

    if (data.otpToken) {
      setCurrentOtpToken(data.otpToken);
      try {
        sessionStorage.setItem("buildcity_otp_token", data.otpToken);
      } catch {}
    }

    return data;
  };

  const verifyOtp = async ({ phone, otp, role = "customer", name, referralCode = null }) => {
    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);
    const cleanOtp = otp.trim();
    let storedOtpToken = currentOtpToken;
    if (!storedOtpToken) {
      try {
        storedOtpToken = sessionStorage.getItem("buildcity_otp_token") || "";
      } catch {}
    }

    // vendor account ko check karte hai taaki vendor direct otp se customer jaisa login na kare
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
      body: JSON.stringify({ phone: cleanPhone, otp: cleanOtp, otpToken: storedOtpToken, name, referralCode }),
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

    // check kar rahe hai ki user ka pehle se region set hai ya guest ne koi select kiya hai
    let guestRegion = null;
    try {
      const savedReg = localStorage.getItem("buildcity_region");
      if (savedReg) guestRegion = JSON.parse(savedReg);
    } catch {}

    if (fetchedDbUser?.preferredRegionId || fetchedDbUser?.preferredRegionName) {
      // agar db me saved region mila toh us region par switch event fire kar do
      window.dispatchEvent(
        new CustomEvent("buildcity_user_preferred_region", {
          detail: {
            regionId: fetchedDbUser.preferredRegionId,
            regionName: fetchedDbUser.preferredRegionName,
          },
        })
      );
    } else if (guestRegion && (guestRegion.id || guestRegion.name)) {
      // agar guest ne koi region select kiya tha toh ab login ke baad db me save kar dete hai
      if (apiData.token) {
        authFetch("/api/v1/users/preferred-region", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regionId: guestRegion.id,
            regionName: guestRegion.name,
          }),
        }).catch(() => {});
      }
    }

    const userObj = {
      id: fetchedDbUser?.id || drMatch?.id || vendorMatch?.id || "user-" + Date.now(),
      name: resolvedName,
      email: fetchedDbUser?.email || "",
      phone: cleanPhone,
      role: assignedRole,
      preferredRegionId: fetchedDbUser?.preferredRegionId || guestRegion?.id || null,
      preferredRegionName: fetchedDbUser?.preferredRegionName || guestRegion?.name || null,
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

    // profile ko state aur local storage dono me update karte hai
    persist(updatedUser);

    // ab nayi profile ko database me update karne ke liye api call bhej rahe hai
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
      console.log("Profile updated in Supabase PostgreSQL Cloud Database!");
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

  const vendorLogin = async ({ phone, password, fcmToken }) => {
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const cleanPassword = password.trim();

    const response = await authFetch(`/api/v1/auth/vendor/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, password: cleanPassword, fcmToken }),
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
      drInfo: data.dr || data.user?.drInfo,
      vendorInfo: data.vendor || data.user?.vendorInfo,
      token: data.token,
    };

    // safety ke liye password aur hash ko local storage me save karne se pehle delete kar dete hai
    delete userObj.password;
    delete userObj.passwordHash;
    if (userObj.vendorInfo) {
      delete userObj.vendorInfo.password;
      delete userObj.vendorInfo.passwordHash;
    }
    if (userObj.drInfo) {
      delete userObj.drInfo.password;
      delete userObj.drInfo.passwordHash;
    }

    persist(userObj);
    return userObj;
  };

  const logout = () => {
    if (user) {
      const vId = user.vendorInfo?.id || user.vendorId || user.id;
      unregisterVendorPushNotifications(vId).catch(() => {});
    }
    setUser(null);
    clearToken();
    localStorage.removeItem(STORAGE_KEY);
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith("buildcity_vendor_orders_") ||
            k === "buildcity_last_vendor_orders" ||
            k === "vendor_fcm_token")
        ) {
          localStorage.removeItem(k);
        }
      }
    } catch (_) {}
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