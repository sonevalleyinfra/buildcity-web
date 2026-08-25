import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

const RegionContext = createContext(null);
const STORAGE_KEY = "buildcity_region";

export function RegionProvider({ children }) {
  const [regions, setRegions] = useState([]);
  const [region, setRegionState] = useState(() => {
    return { id: "default", name: "Varanasi", state: "Uttar Pradesh", baseDeliveryCharge: 49, priceFactor: 1 };
  });

  // Fetch live active regions directly from Supabase Database
  const loadDbRegions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/regions`);
      if (res.ok) {
        const dbRegs = await res.json();
        if (Array.isArray(dbRegs)) {
          // Filter only ACTIVE regions from DB
          const activeRegs = dbRegs
            .filter((r) => r.isActive !== false)
            .map((r) => ({
              id: r.id,
              name: r.name,
              state: r.state || "Uttar Pradesh",
              baseDeliveryCharge: Number(r.baseDeliveryCharge) || 49,
              priceFactor: 1,
            }));

          if (activeRegs.length > 0) {
            setRegions(activeRegs);

            // Update current selected region if saved in localStorage
            const savedIdOrName = localStorage.getItem(STORAGE_KEY);
            const found = activeRegs.find(
              (r) =>
                r.id === savedIdOrName ||
                r.name.toLowerCase().trim() === (savedIdOrName || "").toLowerCase().trim()
            );

            if (found) {
              setRegionState(found);
            } else if (activeRegs[0]) {
              setRegionState(activeRegs[0]);
              localStorage.setItem(STORAGE_KEY, activeRegs[0].id);
            }
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Live DB Region fetch note:", err.message);
    }
  };

  useEffect(() => {
    loadDbRegions();

    // 1. Listen for custom regions updated event, storage event, and tab focus
    const handleUpdate = () => loadDbRegions();
    window.addEventListener("buildcity_regions_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    // 2. Continuous background poll every 10 seconds to keep Home and Navbar 100% updated from DB
    const interval = setInterval(() => {
      loadDbRegions();
    }, 10000);

    return () => {
      window.removeEventListener("buildcity_regions_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const setRegion = (regionId) => {
    const found = regions.find(
      (r) =>
        r.id === regionId ||
        r.name.toLowerCase().trim() === (regionId || "").toLowerCase().trim()
    );
    if (found) {
      setRegionState(found);
      localStorage.setItem(STORAGE_KEY, found.id);
    }
  };

  return (
    <RegionContext.Provider value={{ region, setRegion, regions }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used inside RegionProvider");
  return ctx;
}