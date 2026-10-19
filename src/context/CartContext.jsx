import { authFetch } from "../config/authFetch";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRegion } from "./RegionContext";
import { useAuth } from "./AuthContext";
import { useAlert } from "./AlertContext";
import { API_BASE_URL } from "../config/api";
import { cleanProductImage } from "../utils/productImage";

// Customer cart ka state, database sync aur district pricing ka context
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { region } = useRegion();
  const { showAlert } = useAlert();
  const [items, setItems] = useState([]);
  const [lastAddedAt, setLastAddedAt] = useState(0);
  const isInitialCloudSyncDone = useRef(false);

  // Applied Coupon state persisted in localStorage
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem("buildcity_applied_coupon");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const applyCoupon = (coupon) => {
    setAppliedCoupon(coupon);
    try {
      if (coupon) {
        localStorage.setItem("buildcity_applied_coupon", JSON.stringify(coupon));
      } else {
        localStorage.removeItem("buildcity_applied_coupon");
      }
    } catch {}
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    try {
      localStorage.removeItem("buildcity_applied_coupon");
    } catch {}
  };

  // Logged in user ya guest ke liye alag localStorage key nikal rahe hain
  // Partner accounts (admin, dr, vendor) ka shopping cart nahi hota toh unhe skip kiya
  const isPartner = ["admin", "dr", "vendor"].includes(String(user?.role || "").toLowerCase());

  const cartStorageKey = user?.phone
    ? `buildcity_cart_${user.phone.replace(/\D/g, "")}`
    : user?.id
    ? `buildcity_cart_${user.id}`
    : "buildcity_cart_guest";

  // Cart items load karna aur login hote hi guest cart aur database cart ko merge karna
  useEffect(() => {
    let isCancelled = false;

    const syncCart = async () => {
      if (isPartner) {
        isInitialCloudSyncDone.current = false;
        setItems([]);
        return;
      }
      if (user?.phone || user?.id) {
        // 1. Pehle local guest cart ke items check karo
        let guestItems = [];
        try {
          const guestSaved = localStorage.getItem("buildcity_cart_guest");
          if (guestSaved) {
            const parsed = JSON.parse(guestSaved);
            if (Array.isArray(parsed)) guestItems = parsed;
          }
        } catch {}

        // 2. User ke pehle se saved local items check karo
        let localUserItems = [];
        try {
          const userSaved = localStorage.getItem(cartStorageKey);
          if (userSaved) {
            const parsed = JSON.parse(userSaved);
            if (Array.isArray(parsed)) localUserItems = parsed;
          }
        } catch {}

        // 3. Database se user ka live cart fetch karo jo dusre phone ya browser se add hua ho
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

        // 4. Sabhi items ko ek sath combine karke merge karo
        const mergedMap = new Map();

        // Pehle database wale items add karo
        dbCartItems.forEach((it) => {
          if (it && it.id) mergedMap.set(it.id, it);
        });

        // Fir local storage wale user items merge karo
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

        // Fir guest mode me add kiye items merge karo
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

        // Pura merged cart wapas database me update karo
        try {
          authFetch(`${API_BASE_URL}/api/v1/cart`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: finalMerged }),
          }).catch(() => {});
        } catch {}
      } else {
        // Bina login wale guest user ke liye local cart
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
  }, [cartStorageKey, user, isPartner]);

  // Cart me badlav hone par localStorage aur database me background save karo
  useEffect(() => {
    if (!isInitialCloudSyncDone.current) return;

    if (cartStorageKey && Array.isArray(items)) {
      try {
        localStorage.setItem(cartStorageKey, JSON.stringify(items));
      } catch {}

      // Logged in user ke cart ko debounce ke sath database me save karo
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
                // Purana ya invalid token mile toh safai karo
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

  // Cart me product add karne ka function - district factor ke hisab se price lagao
  const addItem = (product, qty = 1) => {
    setLastAddedAt(Date.now());
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
    setItems((prev) => {
      const cur = prev.find((i) => i.id === id);
      if (cur && qty > cur.qty) {
        setLastAddedAt(Date.now());
      }
      return prev.map((i) => (i.id === id ? { ...i, qty } : i));
    });
  };

  const buyNow = (product, quantity = 1) => {
    const isCustomPack = Boolean(product.packLabel && product.packQty > 1);
    const resolvedImg = product.img || (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null) || product.image || product.imageUrl || cleanProductImage(product);
    return {
      id: isCustomPack ? `${product.id}-pack-${product.packQty}` : product.id,
      productId: product.productId || product.id,
      name: isCustomPack ? `${product.name} (${product.packLabel})` : product.name,
      brand: product.brand || "",
      img: resolvedImg,
      image: resolvedImg,
      imageUrl: product.imageUrl || resolvedImg,
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [resolvedImg],
      category: product.category || product.categoryName || "",
      categoryName: product.categoryName || product.category || "",
      price: Number(product.price) || 0,
      basePrice: Number(product.basePrice || product.price) || 0,
      mrp: Number(product.mrp || product.price) || 0,
      packLabel: product.packLabel || null,
      packQty: product.packQty || 1,
      unit: product.unit || "unit",
      vendorId: product.vendorId || "",
      vendorName: product.vendorName || "District Vendor",
      qty: Math.max(1, Number(quantity) || 1),
      addedRegionId: region?.id || null,
      addedRegionName: region?.name || null,
    };
  };

  const clearCart = () => {
    setItems([]);
    removeCoupon();
    try {
      localStorage.removeItem("buildcity_cart_guest");
      localStorage.removeItem("buildcity_cart");
      if (cartStorageKey) {
        localStorage.setItem(cartStorageKey, JSON.stringify([]));
      }
    } catch {}

    if (user?.phone || user?.id) {
      try {
        authFetch(`${API_BASE_URL}/api/v1/cart`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [] }),
        }).catch(() => {});
      } catch {}
    }
    window.dispatchEvent(new CustomEvent("buildcity_cart_cleared"));
  };

  // Check karo ki customer ka active district cart ke district se alag toh nahi hai
  const firstItemWithRegion = items.find((i) => i.addedRegionId);
  const cartRegionId = firstItemWithRegion?.addedRegionId;
  const cartRegionName = firstItemWithRegion?.addedRegionName || "Varanasi";
  const currentRegionName = region?.name || "Varanasi";

  const hasRegionMismatch =
    items.length > 0 &&
    Boolean(cartRegionId) &&
    Boolean(region?.id) &&
    cartRegionId.toLowerCase() !== region.id.toLowerCase();

  // Cart ke sare items ko naye district ke live prices ke sath update karo
  const updateCartToCurrentRegion = async (passedListings = [], targetRegion = null) => {
    const activeRegion = targetRegion || region;
    if (!activeRegion) return { updatedCount: 0, removedItems: [] };

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
      // Naye district ke approved vendor ka matching product dhundo
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
              (listingRegionId && activeRegion.id && listingRegionId.toLowerCase() === activeRegion.id.toLowerCase()) ||
              (listingRegionName && activeRegion.name && listingRegionName.toLowerCase().trim() === activeRegion.name.toLowerCase().trim());

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
          addedRegionId: activeRegion.id,
          addedRegionName: activeRegion.name,
        });
      } else {
        removedItems.push(i.name || i.title || "Product");
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
    const itemMrp = Number(item.mrp) > itemPrice ? Number(item.mrp) : itemPrice;
    return sum + itemMrp * (Number(item.qty) || 1);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        buyNow,
        removeItem,
        updateQty,
        clearCart,
        count,
        total,
        lastAddedAt,
        subtotal,
        mrpTotal,
        cartRegionId,
        cartRegionName,
        currentRegionName,
        hasRegionMismatch,
        updateCartToCurrentRegion,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        couponDiscount: appliedCoupon ? Number(appliedCoupon.discountAmount || 0) : 0,
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