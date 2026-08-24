import { createContext, useContext, useEffect, useState } from "react";
import { useRegion } from "./RegionContext";
import { useAuth } from "./AuthContext";

// Cart context - user isolated cart storage & regional pricing
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { region } = useRegion();
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

  // Function to update cart prices according to the newly selected region
  const updateCartToCurrentRegion = (allVendorListings = []) => {
    if (!region) return;

    setItems((prev) =>
      prev.map((i) => {
        const base = i.basePrice || i.price;
        let newPrice = Math.round(base * (region.priceFactor || 1));
        let newVendorId = i.vendorId;
        let newVendorName = i.vendorName;

        // Try to match vendor listing in new region if available
        if (Array.isArray(allVendorListings) && allVendorListings.length > 0) {
          const matchingListing = allVendorListings.find((l) => {
            const matchProduct = l.masterProductId === i.masterProductId || l.name === i.name;
            const listingReg = l.vendor?.region?.name || l.regionName || "";
            return matchProduct && listingReg.toLowerCase().trim() === region.name.toLowerCase().trim();
          });

          if (matchingListing) {
            newPrice = Number(matchingListing.price) || newPrice;
            newVendorId = matchingListing.vendorId || newVendorId;
            newVendorName = matchingListing.vendor?.shopName || matchingListing.vendorName || newVendorName;
          }
        }

        return {
          ...i,
          basePrice: base,
          price: newPrice,
          vendorId: newVendorId,
          vendorName: newVendorName,
          addedRegionId: region.id,
          addedRegionName: region.name,
        };
      })
    );
  };

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