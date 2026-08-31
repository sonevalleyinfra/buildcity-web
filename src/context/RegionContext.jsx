import { authFetch } from "../config/authFetch";
import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

const RegionContext = createContext(null);
const STORAGE_KEY = "buildcity_region";

export function RegionProvider({ children }) {
  const [regions, setRegions] = useState([]);
  const [region, setRegionState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        if (saved.startsWith("{")) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.name) return parsed;
        }
        if (typeof saved === "string" && saved.trim()) {
          const name = saved.charAt(0).toUpperCase() + saved.slice(1);
          return { id: saved.toLowerCase(), name, state: "Uttar Pradesh", baseDeliveryCharge: 49, priceFactor: 1 };
        }
      }
    } catch {}
    return { id: "varanasi", name: "Varanasi", state: "Uttar Pradesh", baseDeliveryCharge: 49, priceFactor: 1 };
  });

  // Fetch live active regions directly from Supabase Database
  const loadDbRegions = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/regions`);
      if (res.ok) {
        const dbRegs = await res.json();
        if (Array.isArray(dbRegs) && dbRegs.length > 0) {
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
            const savedRaw = localStorage.getItem(STORAGE_KEY);
            let savedSearch = "";
            if (savedRaw) {
              try {
                const parsed = JSON.parse(savedRaw);
                savedSearch = parsed?.id || parsed?.name || savedRaw;
              } catch {
                savedSearch = savedRaw;
              }
            }

            if (savedSearch) {
              const found = activeRegs.find(
                (r) =>
                  r.id.toLowerCase() === savedSearch.toLowerCase() ||
                  r.name.toLowerCase().trim() === savedSearch.toLowerCase().trim()
              );

              if (found) {
                setRegionState(found);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
                return;
              }
            }

            // Fallback to first region only if nothing saved in localStorage
            if (!savedSearch) {
              setRegionState(activeRegs[0]);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(activeRegs[0]));
            }
          }
        }
      }
    } catch (err) {
      console.warn("Live DB Region fetch note:", err.message);
    }
  };

  useEffect(() => {
    loadDbRegions();

    const handleUpdate = () => loadDbRegions();
    window.addEventListener("buildcity_regions_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("buildcity_regions_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const setRegion = (regionIdOrObj) => {
    let found = null;
    if (typeof regionIdOrObj === "object" && regionIdOrObj !== null) {
      found = regionIdOrObj;
    } else {
      found = regions.find(
        (r) =>
          r.id === regionIdOrObj ||
          r.name.toLowerCase().trim() === (regionIdOrObj || "").toLowerCase().trim()
      );
    }
    if (found) {
      setRegionState(found);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
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