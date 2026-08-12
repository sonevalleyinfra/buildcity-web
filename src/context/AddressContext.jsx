import { createContext, useContext, useEffect, useState } from "react";

const AddressContext = createContext(null);
const STORAGE_KEY = "buildcity_addresses";

const seedAddresses = [
  {
    id: "addr1",
    label: "Home",
    line: "House No. 12, Lanka Road, Near BHU Gate",
    city: "Varanasi",
    state: "Uttar Pradesh",
    pincode: "221005",
    isDefault: true,
  },
];

export function AddressProvider({ children }) {
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setAddresses(JSON.parse(saved));
      } catch {
        setAddresses(seedAddresses);
      }
    } else {
      setAddresses(seedAddresses);
    }
  }, []);

  useEffect(() => {
    if (addresses.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
    }
  }, [addresses]);

  const addAddress = (addr) => {
    const newAddr = { ...addr, id: "addr-" + Date.now() };
    setAddresses((prev) => {
      const updated = addr.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev;
      return [...updated, newAddr];
    });
    return newAddr;
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
      value={{ addresses, addAddress, updateAddress, removeAddress, setDefault }}
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