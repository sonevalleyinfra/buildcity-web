import { authFetch } from "../config/authFetch";
import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

const RegionContext = createContext(null);
const STORAGE_KEY = "buildcity_region";
const LOCATION_CHOSEN_KEY = "buildcity_location_selected";

const DEFAULT_REGIONS = [
  { id: "2ab0f187-d170-4432-8eef-e0ac31ed21c3", name: "Varanasi", state: "Uttar Pradesh", baseDeliveryCharge: 49, priceFactor: 1 },
  { id: "aca42de5-60cd-4dbe-9580-b3d10df6d6ff", name: "Jaunpur", state: "Uttar Pradesh", baseDeliveryCharge: 78, priceFactor: 1 },
  { id: "af4bf0c4-389a-4f89-aea2-35b2700bf1e6", name: "Mirzapur", state: "Uttar Pradesh", baseDeliveryCharge: 95, priceFactor: 1 },
  { id: "dc928ebc-b243-4246-989b-c45fd9a27eaf", name: "Prayagraj", state: "Uttar Pradesh", baseDeliveryCharge: 49, priceFactor: 1 },
];

export function RegionProvider({ children }) {
  const [hasExplicitlySelectedLocation, setHasExplicitlySelectedLocation] = useState(() => {
    try {
      return localStorage.getItem(LOCATION_CHOSEN_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [regions, setRegions] = useState(() => {
    try {
      const saved = localStorage.getItem("buildcity_all_regions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_REGIONS;
  });

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
    return DEFAULT_REGIONS[0];
  });

  // Fetch live active regions directly from Database
  const loadDbRegions = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/regions`);
      if (res.ok) {
        const dbRegs = await res.json();
        if (Array.isArray(dbRegs) && dbRegs.length > 0) {
          // All active regions from DB
          const activeRegs = dbRegs
            .filter((r) => r.isActive !== false && r.name)
            .map((r) => ({
              id: r.id,
              name: r.name,
              state: r.state || "Uttar Pradesh",
              baseDeliveryCharge: Number(r.baseDeliveryCharge) || 49,
              priceFactor: 1,
            }));

          if (activeRegs.length > 0) {
            setRegions(activeRegs);
            try {
              localStorage.setItem("buildcity_all_regions", JSON.stringify(activeRegs));
            } catch {}

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
              const activeFound = activeRegs.find(
                (r) =>
                  r.id.toLowerCase() === savedSearch.toLowerCase() ||
                  r.name.toLowerCase().trim() === savedSearch.toLowerCase().trim()
              );
              if (activeFound) {
                setRegionState(activeFound);
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(activeFound));
                } catch {}
              }
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

    // Listen for logged-in user's preferred region from DB
    const handleUserPreferredRegion = (e) => {
      const detail = e.detail;
      if (detail && (detail.regionId || detail.regionName)) {
        setRegion(detail.regionId || detail.regionName);
      }
    };
    window.addEventListener("buildcity_user_preferred_region", handleUserPreferredRegion);

    return () => {
      window.removeEventListener("buildcity_regions_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("buildcity_user_preferred_region", handleUserPreferredRegion);
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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
        localStorage.setItem(LOCATION_CHOSEN_KEY, "true");
        setHasExplicitlySelectedLocation(true);
      } catch {}

      // Save preferred region to DB in background if user is logged in
      try {
        const token = localStorage.getItem("buildcity_token");
        if (token) {
          authFetch(`${API_BASE_URL}/api/v1/users/preferred-region`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ regionId: found.id, regionName: found.name }),
          }).catch(() => {});
        }
      } catch {}
    }
  };

  return (
    <RegionContext.Provider
      value={{
        region,
        setRegion,
        regions,
        hasExplicitlySelectedLocation,
        isLocationModalOpen,
        setIsLocationModalOpen,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used inside RegionProvider");
  return ctx;
}