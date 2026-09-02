import { createContext, useContext, useEffect, useState } from "react";
import { authFetch } from "../config/authFetch";
import { useAuth } from "./AuthContext";
import { API_BASE_URL } from "../config/api";

const AddressContext = createContext(null);

export function AddressProvider({ children }) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

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

  const getDeletedStorageKey = () => {
    const uKey = user?.phone ? user.phone.replace(/\D/g, "") : user?.id || "guest";
    return `buildcity_deleted_addrs_${uKey}`;
  };

  const getDeletedKeys = () => {
    try {
      const saved = localStorage.getItem(getDeletedStorageKey());
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  };

  const addDeletedKey = (key) => {
    if (!key || typeof key !== "string") return;
    try {
      const set = getDeletedKeys();
      set.add(key.toLowerCase().trim());
      localStorage.setItem(getDeletedStorageKey(), JSON.stringify(Array.from(set)));
    } catch {}
  };

  const sanitizeAddressList = (list) => {
    if (!Array.isArray(list)) return [];
    const unique = Array.from(
      new Map(
        list.map((a) => {
          const key = a.id || `${(a.street || a.line || "").toLowerCase().trim()}_${(a.city || "").toLowerCase().trim()}_${(a.pincode || "").trim()}`;
          return [key, a];
        })
      ).values()
    );

    let defaultAssigned = false;
    const withOneDefault = unique.map((a) => {
      if (a.isDefault && !defaultAssigned) {
        defaultAssigned = true;
        return { ...a, isDefault: true };
      }
      return { ...a, isDefault: false };
    });

    if (!defaultAssigned && withOneDefault.length > 0) {
      withOneDefault[0].isDefault = true;
    }

    return withOneDefault;
  };

  // Fetch saved addresses from Supabase DB & sync local storage cleanly
  const fetchDbAddresses = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("buildcity_token") : null;
    if (!user || !token) return;
    const userKey = user.phone || user.id;
    if (!userKey) return;

    try {
      setIsAddressLoading(true);
      const res = await authFetch(`${API_BASE_URL}/api/v1/addresses/me`);
      if (res.ok) {
        const dbList = await res.json();
        if (Array.isArray(dbList)) {
          const deletedSet = getDeletedKeys();
          const formatted = dbList
            .map((a) => ({
              id: a.id,
              fullName: a.fullName || user.name || "Customer",
              phone: a.phone || user.phone || "",
              line: a.street,
              street: a.street,
              city: a.city,
              state: a.state || "Uttar Pradesh",
              pincode: a.pincode,
              isDefault: Boolean(a.isDefault),
            }))
            .filter((a) => {
              const streetKey = (a.street || a.line || "").toLowerCase().trim();
              return !deletedSet.has(a.id) && !deletedSet.has(streetKey);
            });

          const cleanList = sanitizeAddressList(formatted);
          setAddresses(cleanList);
          if (addressStorageKey) {
            try {
              localStorage.setItem(addressStorageKey, JSON.stringify(cleanList));
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn("DB address fetch note:", err.message);
    } finally {
      setIsAddressLoading(false);
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
        setAddresses(sanitizeAddressList(clean));
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
    setIsSavingAddress(true);
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
      const combined = [...updated, formattedAddr];
      if (addressStorageKey) {
        try {
          localStorage.setItem(addressStorageKey, JSON.stringify(combined));
        } catch {}
      }
      return combined;
    });

    // 2. Save into Supabase PostgreSQL DB
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/addresses`, {
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
          return finalObj;
        }
      }
    } catch (err) {
      console.warn("DB Address insert note:", err.message);
    } finally {
      setIsSavingAddress(false);
    }

    return formattedAddr;
  };

  const updateAddress = async (id, updates) => {
    setIsSavingAddress(true);
    // 1. Immediately update local state & localStorage
    setAddresses((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...updates, line: updates.line || updates.street || a.line, street: updates.street || updates.line || a.street } : a));
      if (addressStorageKey) {
        try {
          localStorage.setItem(addressStorageKey, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    // 2. Sync to DB via API
    try {
      await authFetch(`${API_BASE_URL}/api/v1/addresses/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: updates.fullName,
          phone: updates.phone,
          street: updates.street || updates.line,
          city: updates.city,
          state: updates.state,
          pincode: updates.pincode,
          isDefault: updates.isDefault,
        }),
      });
    } catch (err) {
      console.warn("DB address update note:", err.message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const removeAddress = async (id) => {
    const target = addresses.find((a) => a.id === id);
    const streetStr = target?.street || target?.line || "";

    addDeletedKey(id);
    if (streetStr) addDeletedKey(streetStr);

    setAddresses((prev) => {
      const updated = prev.filter(
        (a) =>
          a.id !== id &&
          (!streetStr || (a.street || a.line || "").toLowerCase().trim() !== streetStr.toLowerCase().trim())
      );
      if (addressStorageKey) {
        try {
          localStorage.setItem(addressStorageKey, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    try {
      const url = `${API_BASE_URL}/api/v1/addresses/${encodeURIComponent(id)}?street=${encodeURIComponent(streetStr)}`;
      await authFetch(url, { method: "DELETE" });
    } catch (err) {
      console.warn("DB address delete note:", err.message);
    }
  };

  const setDefault = async (id) => {
    // 1. Immediately update state & localStorage so the UI reflects the change INSTANTLY
    setAddresses((prev) => {
      const target = prev.find((a) => a.id === id);
      const rest = prev.filter((a) => a.id !== id).map((a) => ({ ...a, isDefault: false }));
      const updated = target ? [{ ...target, isDefault: true }, ...rest] : prev;
      if (addressStorageKey) {
        try {
          localStorage.setItem(addressStorageKey, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    // 2. Persist to DB asynchronously
    try {
      await authFetch(`${API_BASE_URL}/api/v1/addresses/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
    } catch (err) {
      console.warn("Set default address API note:", err.message);
    }
  };

  return (
    <AddressContext.Provider
      value={{
        addresses,
        isAddressLoading,
        isSavingAddress,
        addAddress,
        updateAddress,
        removeAddress,
        setDefault,
        fetchDbAddresses,
      }}
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