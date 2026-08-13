import { createContext, useContext, useEffect, useState } from "react";

// AuthContext setup - poore app ka user state, login, OTP verify aur dynamic roles (Customer, DR, Vendor, Admin) yahan se handle hota hai
const AuthContext = createContext(null);
const STORAGE_KEY = "buildcity_auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // App start hone par check karo ki kya koi user pehle se logged in hai (localStorage se load karo)
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

  // User details ko state aur localStorage dono mein safe-save karne ke liye helper function
  const persist = (userObj) => {
    setUser(userObj);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
  };

  
  const requestOtp = async (phone) => {
    await new Promise((r) => setTimeout(r, 600));
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] OTP for ${phone}: 123456 (dev mein koi bhi 6-digit OTP chalega)`);
    }
    return true;
  };

  // OTP Verify & Dynamic Role Matching hai ye :
  // 1. Mobile number '9999999999' -> Direct Super Admin
  // 2. Mobile number DR list mein ACTIVE mila - District Representative (DR)
  // 3. Mobile number Vendor list mein mila - Checks status: APPROVED, PENDING
  // 4. Default -> Standard Customer hamesha rahega 
  const verifyOtp = async ({ phone, otp, role = "customer", name }) => {
    await new Promise((r) => setTimeout(r, 600));

    const cleanPhone = phone.trim();
    let assignedRole = role;
    let drMatch = null;
    let vendorMatch = null;

    //
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
      vendorMatch = vendors.find((v) => v.phone.trim() === cleanPhone);
    } catch {
      vendorMatch = null;
    }

    // Step 3: Role resolution and approval status check karo 
    if (cleanPhone === "9999999999" || cleanPhone === "0000000000") {
      assignedRole = "admin";
    } else if (drMatch) {
      assignedRole = "dr";
    } else if (vendorMatch) {
      if (vendorMatch.status === "PENDING") {
        throw new Error("Aapka vendor account abhi DR ya Admin dwara approval ke liye pending hai.");
      }
      if (vendorMatch.status === "SUSPENDED") {
        throw new Error("Aapka vendor account suspend kar diya gaya hai. Support se sampark karein.");
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

  // New Customer Register function
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

  // Profile Update helper hai  — user ki info (Name, Email) update karke save karta hai
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

// Custom hook -> useAuth() dwara poore app me auth state use karo
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ko sirf AuthProvider ke andar hi use karein");
  return ctx;
}