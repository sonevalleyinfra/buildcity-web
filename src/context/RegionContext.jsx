import { createContext, useContext, useEffect, useState } from "react";

const RegionContext = createContext(null);
const STORAGE_KEY = "buildcity_region";

// TEMPORARY MOCK id hai ,  - replace with GET /api/v1/regions once backend is ready
export const REGIONS = [
  { id: "varanasi", name: "Varanasi", state: "Uttar Pradesh", priceFactor: 1 },
  { id: "mirzapur", name: "Mirzapur", state: "Uttar Pradesh", priceFactor: 1.08 },
  { id: "prayagraj", name: "Prayagraj", state: "Uttar Pradesh", priceFactor: 1.05 },
  { id: "jaunpur", name: "Jaunpur", state: "Uttar Pradesh", priceFactor: 1.1 },
];

export function RegionProvider({ children }) {
  const [region, setRegionState] = useState(REGIONS[0]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = REGIONS.find((r) => r.id === saved);
      if (found) setRegionState(found);
    }
  }, []);

  const setRegion = (regionId) => {
    const found = REGIONS.find((r) => r.id === regionId);
    if (found) {
      setRegionState(found);
      localStorage.setItem(STORAGE_KEY, regionId);
    }
  };

  return (
    <RegionContext.Provider value={{ region, setRegion, regions: REGIONS }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used inside RegionProvider");
  return ctx;
}