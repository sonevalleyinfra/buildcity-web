import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const API_BASE_URL = "https://buildcity-web.onrender.com";
const AddressContext = createContext(null);

export function AddressProvider({ children }) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);

  // Compute unique storage key for logged-in user or guest
  const addressStorageKey = user?.phone
    ? `buildcity_addresses_${user.phone.replace(/\D/g, "")}`
    : user?.id
    ? `buildcity_addresses_${user.id}`
    : "buildcity_addresses_guest";

  // Clean legacy global key once if present
  useEffect(() => {
    try {
      localStorage.removeItem("buildcity_addresses");
    } catch {}
  }, []);

  // Fetch saved addresses from Supabase DB & sync local storage
  const fetchDbAddresses = async () => {
    if (!user) return;
    const userKey = user.phone || user.id;
    if (!userKey) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/addresses/user/${userKey}`);
      if (res.ok) {
        const dbList = await res.json();
        if (Array.isArray(dbList) && dbList.length > 0) {
          const formatted = dbList.map((a) => ({
            id: a.id,
            fullName: a.fullName || user.name || "Customer",
            phone: a.phone || user.phone || "",
            line: a.street,
            street: a.street,
            city: a.city,
            state: a.state || "Uttar Pradesh",
            pincode: a.pincode,
            isDefault: a.isDefault || false,
          }));
          setAddresses(formatted);
          if (addressStorageKey) {
            localStorage.setItem(addressStorageKey, JSON.stringify(formatted));
          }
          return;
        }
      }
    } catch (err) {
      console.warn("DB address fetch note:", err.message);
    }
  };

  // Load addresses when user or addressStorageKey changes
  useEffect(() => {
    if (!addressStorageKey || addressStorageKey === "buildcity_addresses_guest") {
      setAddresses([]);
      return;
    }

    const saved = localStorage.getItem(addressStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const clean = (Array.isArray(parsed) ? parsed : []).filter(
          (a) => a.line && !a.line.includes("House No. 12, Lanka Road") && a.id !== "addr1"
        );
        setAddresses(clean);
      } catch {
        setAddresses([]);
      }
    }

    fetchDbAddresses();
  }, [user, addressStorageKey]);

  // Persist addresses to user-specific storage key
  useEffect(() => {
    if (addressStorageKey && addressStorageKey !== "buildcity_addresses_guest") {
      localStorage.setItem(addressStorageKey, JSON.stringify(addresses));
    }
  }, [addresses, addressStorageKey]);

  const addAddress = async (addr) => {
    const tempId = "addr-" + Date.now();
    const formattedAddr = {
      id: tempId,
      fullName: addr.fullName || user?.name || "Customer",
      phone: addr.phone || user?.phone || "7607650875",
      line: addr.street || addr.line,
      street: addr.street || addr.line,
      city: addr.city || "Mirzapur",
      state: addr.state || "Uttar Pradesh",
      pincode: addr.pincode || "221001",
      isDefault: addr.isDefault ?? true,
    };

    // 1. Update local state
    setAddresses((prev) => {
      const updated = formattedAddr.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev;
      return [...updated, formattedAddr];
    });

    // 2. Save directly into Supabase PostgreSQL DB (public.addresses table)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          fullName: formattedAddr.fullName,
          phone: formattedAddr.phone,
          street: formattedAddr.street,
          city: formattedAddr.city,
          state: formattedAddr.state,
          pincode: formattedAddr.pincode,
        }),
      });

      if (res.ok) {
        const dbCreated = await res.json();
        if (dbCreated && dbCreated.id) {
          const finalObj = { ...formattedAddr, id: dbCreated.id };
          setAddresses((prev) =>
            prev.map((a) => (a.id === tempId ? finalObj : a))
          );
          console.log("✓ Address saved to Supabase DB addresses table:", dbCreated.id);
          return finalObj;
        }
      }
    } catch (err) {
      console.warn("DB Address insert note:", err.message);
    }

    return formattedAddr;
  };

  const updateAddress = (id, updates) => {
    setAddresses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const removeAddress = (id) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const setDefault = (id) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
  };

  return (
    <AddressContext.Provider
      value={{ addresses, addAddress, updateAddress, removeAddress, setDefault, fetchDbAddresses }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export function useAddresses() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddresses must be used inside AddressProvider");
  return ctx;
}