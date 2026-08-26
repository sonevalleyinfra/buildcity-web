import { createContext, useContext, useEffect, useState } from "react";
import { useRegion } from "./RegionContext";
import { useAuth } from "./AuthContext";
import { useAlert } from "./AlertContext";

// Cart context - user isolated cart storage & regional pricing
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { region } = useRegion();
  const { showAlert } = useAlert();
  const [items, setItems] = useState([]);

  // Compute unique storage key for logged-in user or guest
  const cartStorageKey = user?.phone
    ? `buildcity_cart_${user.phone.replace(/\D/g, "")}`
    : user?.id
    ? `buildcity_cart_${user.id}`
    : "buildcity_cart_guest";

  // Load cart items whenever user or cartStorageKey changes
  useEffect(() => {
    const saved = localStorage.getItem(cartStorageKey);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        setItems([]);
      }
    } else {
      setItems([]);
    }
  }, [cartStorageKey]);

  // Persist cart items to user-specific storage key
  useEffect(() => {
    if (cartStorageKey) {
      localStorage.setItem(cartStorageKey, JSON.stringify(items));
    }
  }, [items, cartStorageKey]);

  // product price add karte waqt base price and regional price set karein
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

  const clearCart = () => setItems([]);

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
      const syncRes = await fetch(`${API_BASE_URL}/api/v1/cloud-sync`).then((r) => r.json()).catch(() => null);
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

            const matchRegion =
              (listingRegionName && listingRegionName.toLowerCase().trim() === region.name.toLowerCase().trim()) ||
              (listingRegionId && listingRegionId.toLowerCase().trim() === region.id.toLowerCase().trim());

            return isApproved && matchProduct && matchRegion;
          })
        : null;

      if (matchingListing) {
        // Case 1: Product IS sold by a vendor in the new region -> update price to that region's vendor price
        const realPrice = Number(matchingListing.price) || i.price;
        const realVendorId = matchingListing.vendorId || i.vendorId;
        const realVendorName = matchingListing.vendor?.shopName || matchingListing.vendorName || i.vendorName;

        updatedItems.push({
          ...i,
          price: realPrice,
          vendorId: realVendorId,
          vendorName: realVendorName,
          addedRegionId: region.id,
          addedRegionName: region.name,
        });
      } else {
        // Check if this product is listed by vendors in OTHER regions but NOT in the new region
        const isVendorListedElsewhere = Array.isArray(listings) && listings.some((l) => {
          return (l.masterProductId && i.masterProductId && l.masterProductId === i.masterProductId) ||
                 (l.id && i.id && l.id === i.id) ||
                 (l.name && i.name && l.name.toLowerCase().trim() === i.name.toLowerCase().trim());
        });

        if (isVendorListedElsewhere || !i.isMasterProduct) {
          // Product is NOT sold by any supplier in the new region -> REMOVE FROM CART
          removedItems.push(i.name);
        } else {
          // General master product available everywhere -> recalculate price using the new region's price factor
          const base = Number(i.basePrice || i.suggestedPrice || i.price);
          const calculatedPrice = Math.round(base * Number(region.priceFactor || 1.0));
          updatedItems.push({
            ...i,
            price: calculatedPrice,
            addedRegionId: region.id,
            addedRegionName: region.name,
          });
        }
      }
    });

    setItems(updatedItems);
    return { updatedCount: updatedItems.length, removedItems };
  };

  // Automatic Cart Region Sync: Automatically update prices or auto-remove unavailable items when region changes
  useEffect(() => {
    if (items.length > 0 && region?.id) {
      updateCartToCurrentRegion().then((res) => {
        if (res && res.removedItems && res.removedItems.length > 0) {
          showAlert({
            title: "📍 Region Availability Notice",
            message: `The following product(s) are not sold in ${region.name} and have been automatically removed from your cart:\n\n• ${res.removedItems.join("\n• ")}`,
            type: "warning",
            buttonText: "Got It",
          });
        }
      });
    }
  }, [region?.id, region?.name]);

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const mrpTotal = items.reduce((sum, i) => sum + (i.mrp || i.price) * i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        count,
        subtotal,
        mrpTotal,
        hasRegionMismatch,
        cartRegionName,
        currentRegionName: region?.name || "Varanasi",
        updateCartToCurrentRegion,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}