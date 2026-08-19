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

  // region change hone par cart price auto refresh
  useEffect(() => {
    if (region && items.length > 0) {
      setItems((prev) =>
        prev.map((i) => {
          const base = i.basePrice || i.price;
          return {
            ...i,
            basePrice: base,
            price: Math.round(base * (region.priceFactor || 1)),
          };
        })
      );
    }
  }, [region?.id]);

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
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...prev, { ...product, basePrice: base, price: calculatedPrice, qty }];
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

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const mrpTotal = items.reduce((sum, i) => sum + i.mrp * i.qty, 0);

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