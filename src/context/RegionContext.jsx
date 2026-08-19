import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

const RegionContext = createContext(null);
const STORAGE_KEY = "buildcity_region";

export const DEFAULT_REGIONS = [
  { id: "varanasi", name: "Varanasi", state: "Uttar Pradesh", priceFactor: 1 },
  { id: "mirzapur", name: "Mirzapur", state: "Uttar Pradesh", priceFactor: 1.08 },
  { id: "prayagraj", name: "Prayagraj", state: "Uttar Pradesh", priceFactor: 1.05 },
  { id: "jaunpur", name: "Jaunpur", state: "Uttar Pradesh", priceFactor: 1.1 },
];

export function RegionProvider({ children }) {
  const [regions, setRegions] = useState(DEFAULT_REGIONS);
  const [region, setRegionState] = useState(DEFAULT_REGIONS[0]);

  // DB se live regions fetch karo
  useEffect(() => {
    const loadDbRegions = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/regions`);
        if (res.ok) {
          const dbRegs = await res.json();
          if (Array.isArray(dbRegs) && dbRegs.length > 0) {
            const formatted = dbRegs.map((r, index) => ({
              id: r.id || r.name.toLowerCase(),
              name: r.name,
              state: r.state || "Uttar Pradesh",
              priceFactor: index === 0 ? 1 : 1 + (index * 0.03),
            }));
            setRegions(formatted);
            const saved = localStorage.getItem(STORAGE_KEY);
            const found = formatted.find((r) => r.id === saved || r.name.toLowerCase() === (saved || "").toLowerCase());
            setRegionState(found || formatted[0]);
            return;
          }
        }
      } catch (err) {
        console.warn("Region fetch note:", err.message);
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      const found = DEFAULT_REGIONS.find((r) => r.id === saved);
      if (found) setRegionState(found);
    };
    loadDbRegions();
  }, []);

  const setRegion = (regionId) => {
    const found = regions.find((r) => r.id === regionId || r.name.toLowerCase() === (regionId || "").toLowerCase());
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