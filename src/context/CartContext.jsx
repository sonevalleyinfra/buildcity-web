import { authFetch } from "../config/authFetch";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRegion } from "./RegionContext";
import { useAuth } from "./AuthContext";
import { useAlert } from "./AlertContext";
import { API_BASE_URL } from "../config/api";

// Cart context - User isolated cart storage, Cloud DB Sync, and regional pricing
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { region } = useRegion();
  const { showAlert } = useAlert();
  const [items, setItems] = useState([]);
  const isInitialCloudSyncDone = useRef(false);

  // Compute unique storage key for logged-in user or guest
  const cartStorageKey = user?.phone
    ? `buildcity_cart_${user.phone.replace(/\D/g, "")}`
    : user?.id
    ? `buildcity_cart_${user.id}`
    : "buildcity_cart_guest";

  // Load cart items & automatically merge Cloud DB cart + Guest cart upon login
  useEffect(() => {
    let isCancelled = false;

    const syncCart = async () => {
      if (user?.phone || user?.id) {
        // 1. Check local guest items
        let guestItems = [];
        try {
          const guestSaved = localStorage.getItem("buildcity_cart_guest");
          if (guestSaved) {
            const parsed = JSON.parse(guestSaved);
            if (Array.isArray(parsed)) guestItems = parsed;
          }
        } catch {}

        // 2. Check local user saved items
        let localUserItems = [];
        try {
          const userSaved = localStorage.getItem(cartStorageKey);
          if (userSaved) {
            const parsed = JSON.parse(userSaved);
            if (Array.isArray(parsed)) localUserItems = parsed;
          }
        } catch {}

        // 3. Fetch Cloud DB Cart for logged-in account (e.g. from phone or another device)
        let dbCartItems = [];
        try {
          const res = await authFetch(`${API_BASE_URL}/api/v1/cart`).then((r) => r.json()).catch(() => null);
          if (res && Array.isArray(res.cartItems)) {
            dbCartItems = res.cartItems;
          }
        } catch (err) {
          console.warn("Fetch cloud cart note:", err.message);
        }

        if (isCancelled) return;

        // 4. Merge all sources: DB items + Local User items + Guest items
        const mergedMap = new Map();

        // Priority 1: DB items (from phone / cross-device)
        dbCartItems.forEach((it) => {
          if (it && it.id) mergedMap.set(it.id, it);
        });

        // Priority 2: Local user items
        localUserItems.forEach((it) => {
          if (it && it.id) {
            if (mergedMap.has(it.id)) {
              const existing = mergedMap.get(it.id);
              mergedMap.set(it.id, {
                ...existing,
                qty: Math.max(Number(existing.qty) || 1, Number(it.qty) || 1),
              });
            } else {
              mergedMap.set(it.id, it);
            }
          }
        });

        // Priority 3: Guest items
        guestItems.forEach((it) => {
          if (it && it.id) {
            if (mergedMap.has(it.id)) {
              const existing = mergedMap.get(it.id);
              mergedMap.set(it.id, {
                ...existing,
                qty: Math.max(Number(existing.qty) || 1, Number(it.qty) || 1),
              });
            } else {
              mergedMap.set(it.id, it);
            }
          }
        });

        const finalMerged = Array.from(mergedMap.values());
        setItems(finalMerged);
        isInitialCloudSyncDone.current = true;

        try {
          localStorage.setItem(cartStorageKey, JSON.stringify(finalMerged));
          if (guestItems.length > 0) {
            localStorage.removeItem("buildcity_cart_guest");
          }
        } catch {}

        // Sync merged result back to Cloud Database
        try {
          authFetch(`${API_BASE_URL}/api/v1/cart`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: finalMerged }),
          }).catch(() => {});
        } catch {}
      } else {
        // Guest mode
        isInitialCloudSyncDone.current = true;
        try {
          const guestSaved = localStorage.getItem("buildcity_cart_guest");
          if (guestSaved) {
            const parsed = JSON.parse(guestSaved);
            setItems(Array.isArray(parsed) ? parsed : []);
          } else {
            setItems([]);
          }
        } catch {
          setItems([]);
        }
      }
    };

    syncCart();

    return () => {
      isCancelled = true;
    };
  }, [cartStorageKey, user]);

  // Persist cart items to localStorage and Cloud DB in background
  useEffect(() => {
    if (!isInitialCloudSyncDone.current) return;

    if (cartStorageKey && Array.isArray(items)) {
      try {
        localStorage.setItem(cartStorageKey, JSON.stringify(items));
      } catch {}

      // If logged in, sync to Cloud Database with 1.2s debounce to avoid exhausting connection pool
      if (user?.phone || user?.id) {
        const token = localStorage.getItem("buildcity_token");
        if (token) {
          const timer = setTimeout(() => {
            authFetch(`${API_BASE_URL}/api/v1/cart`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items }),
            }).then(r => r.json()).then(data => {
              if (data && data.invalidSession) {
                // Stale token detected; remove it to prevent looping
                localStorage.removeItem("buildcity_token");
                localStorage.removeItem("buildcity_user");
              }
            }).catch(() => {});
          }, 1200);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [items, cartStorageKey, user]);

  // Product add karte waqt base price and regional price set karein
  const addItem = (product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      const base = product.basePrice || product.price;
      const calculatedPrice = Math.round(base * (region?.priceFactor || 1));
      const currentRegId = region?.id || "varanasi";
      const currentRegName = region?.name || "Varanasi";

      if (existing) {
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, qty: i.qty + qty, addedRegionId: currentRegId, addedRegionName: currentRegName }
            : i
        );
      }
      return [
        ...prev,
        {
          ...product,
          basePrice: base,
          price: calculatedPrice,
          qty,
          addedRegionId: currentRegId,
          addedRegionName: currentRegName,
        },
      ];
    });
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id, qty) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const clearCart = () => {
    setItems([]);
    if (user?.phone || user?.id) {
      try {
        authFetch(`${API_BASE_URL}/api/v1/cart`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [] }),
        }).catch(() => {});
      } catch {}
    }
  };

  // Detect if current selected region differs from cart items' added region
  const firstItemWithRegion = items.find((i) => i.addedRegionId);
  const cartRegionId = firstItemWithRegion?.addedRegionId;
  const cartRegionName = firstItemWithRegion?.addedRegionName || "Varanasi";

  const hasRegionMismatch =
    items.length > 0 &&
    Boolean(cartRegionId) &&
    Boolean(region?.id) &&
    cartRegionId.toLowerCase() !== region.id.toLowerCase();

  // Function to update cart prices directly from live database listings in current region
  const updateCartToCurrentRegion = async (passedListings = []) => {
    if (!region) return { updatedCount: 0, removedItems: [] };

    let listings = passedListings;
    try {
      const syncRes = await authFetch(`${API_BASE_URL}/api/v1/cloud-sync`).then((r) => r.json()).catch(() => null);
      if (syncRes && Array.isArray(syncRes.listings) && syncRes.listings.length > 0) {
        listings = syncRes.listings;
      }
    } catch (err) {
      console.warn("Fetch live cloud sync listings note:", err.message);
    }

    const removedItems = [];
    const updatedItems = [];

    items.forEach((i) => {
      // Find matching approved vendor listing in new region
      const matchingListing = Array.isArray(listings)
        ? listings.find((l) => {
            const isApproved = (l.approvalStatus || "APPROVED") === "APPROVED";
            const matchProduct =
              (l.masterProductId && i.masterProductId && l.masterProductId === i.masterProductId) ||
              (l.id && i.id && l.id === i.id) ||
              (l.name && i.name && l.name.toLowerCase().trim() === i.name.toLowerCase().trim());

            const listingRegionName = l.vendor?.region?.name || l.regionName || "";
            const listingRegionId = l.vendor?.region?.id || l.regionId || "";

            const matchesRegion =
              (listingRegionId && region.id && listingRegionId.toLowerCase() === region.id.toLowerCase()) ||
              (listingRegionName && region.name && listingRegionName.toLowerCase().trim() === region.name.toLowerCase().trim());

            return isApproved && matchProduct && matchesRegion;
          })
        : null;

      if (matchingListing) {
        const newPrice = Number(matchingListing.price) || i.price;
        updatedItems.push({
          ...i,
          price: newPrice,
          vendorId: matchingListing.vendorId || i.vendorId,
          vendorName: matchingListing.vendor?.shopName || matchingListing.vendorName || i.vendorName,
          addedRegionId: region.id,
          addedRegionName: region.name,
        });
      } else {
        removedItems.push(i);
      }
    });

    setItems(updatedItems);
    return {
      updatedCount: updatedItems.length,
      removedItems,
    };
  };

  const count = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
  const subtotal = total;
  const mrpTotal = items.reduce((sum, item) => {
    const itemPrice = Number(item.price) || 0;
    const itemMrp = Number(item.mrp) > itemPrice ? Number(item.mrp) : Math.round(itemPrice * 1.2);
    return sum + itemMrp * (Number(item.qty) || 1);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        count,
        total,
        subtotal,
        mrpTotal,
        cartRegionId,
        cartRegionName,
        hasRegionMismatch,
        updateCartToCurrentRegion,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}