import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { authFetch } from "../config/authFetch";
import { API_BASE_URL } from "../config/api";

const AdminContext = createContext(null);

const seedDrs = [];
const seedVendors = [];

const seedCategories = [
  { id: "c1", name: "Cement", productCount: 120, isActive: true },
  { id: "c2", name: "Paints", productCount: 150, isActive: true },
  { id: "c3", name: "Steel", productCount: 100, isActive: true },
  { id: "c4", name: "Plumbing", productCount: 80, isActive: true },
  { id: "c5", name: "Electrical", productCount: 120, isActive: true },
];

const seedRegions = [];

const seedMasterProducts = [];
const seedProducts = [];
const seedUsers = [];

const CATS_STORAGE_KEY = "buildcity_admin_categories";
const REGS_STORAGE_KEY = "buildcity_admin_regions";
const DRS_STORAGE_KEY = "buildcity_admin_drs";
const VENDORS_STORAGE_KEY = "buildcity_admin_vendors";

const loadInitialCategories = () => {
  try {
    const saved = localStorage.getItem(CATS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Map(parsed.map((c) => [c.name.toLowerCase().trim(), c])).values());
      }
    }
  } catch {}
  return seedCategories;
};

const loadInitialRegions = () => {
  try {
    const saved = localStorage.getItem(REGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Map(parsed.map((r) => [r.name.toLowerCase().trim(), r])).values());
      }
    }
  } catch {}
  return [];
};

const loadInitialDrs = () => {
  try {
    const saved = localStorage.getItem(DRS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

const loadInitialVendors = () => {
  try {
    const saved = localStorage.getItem(VENDORS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

const COUPONS_STORAGE_KEY = "buildcity_admin_coupons";

const seedCoupons = [
  { id: "cp-1", code: "BUILDCITY100", title: "Flat ₹100 OFF", minOrder: 1000, discountAmount: 100, expiryDate: "2026-12-31", isActive: true, desc: "Valid on orders above ₹1,000" },
  { id: "cp-2", code: "SUPER500", title: "Flat ₹500 OFF", minOrder: 5000, discountAmount: 500, expiryDate: "2026-12-31", isActive: true, desc: "Bulk order discount above ₹5,000" },
  { id: "cp-3", code: "WELCOME200", title: "Flat ₹200 OFF", minOrder: 1500, discountAmount: 200, expiryDate: "2026-12-31", isActive: true, desc: "Special welcome coupon for new site orders" },
];

const loadInitialCoupons = () => {
  try {
    const saved = localStorage.getItem(COUPONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return seedCoupons;
};

const USERS_STORAGE_KEY = "buildcity_admin_users";
const PRODUCTS_STORAGE_KEY = "buildcity_admin_products";

const loadInitialUsers = () => {
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return seedUsers;
};

const loadInitialProducts = () => {
  try {
    const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
};

export function AdminProvider({ children }) {
  const { user } = useAuth() || {};
  const userRole = (user?.role || "").toLowerCase();
  const isAdminOrDr = userRole === "admin" || userRole === "dr";

  const [drs, setDrs] = useState(loadInitialDrs);
  const [vendors, setVendors] = useState(loadInitialVendors);
  const [users, setUsers] = useState(loadInitialUsers);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState(loadInitialCategories);
  const [regions, setRegions] = useState(loadInitialRegions);
  const [coupons, setCoupons] = useState(loadInitialCoupons);
  const [masterProducts, setMasterProducts] = useState([]);
  const [products, setProducts] = useState(loadInitialProducts);
  const [productsLoading, setProductsLoading] = useState(true);

  // Fetch Public Catalog for standard customers and visitors (without triggering 403)
  const fetchPublicCatalog = async () => {
    try {
      const [catsRes, regsRes, listingsRes, couponsRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/v1/categories`).then((r) => r.json()).catch(() => []),
        authFetch(`${API_BASE_URL}/api/v1/regions`).then((r) => r.json()).catch(() => []),
        authFetch(`${API_BASE_URL}/api/v1/vendor/listings`).then((r) => r.json()).catch(() => []),
        authFetch(`${API_BASE_URL}/api/v1/coupons`).then((r) => r.json()).catch(() => []),
      ]);

      if (Array.isArray(catsRes) && catsRes.length > 0) {
        setCategories(catsRes);
      }
      if (Array.isArray(regsRes) && regsRes.length > 0) {
        setRegions(regsRes);
      }
      if (Array.isArray(listingsRes) && listingsRes.length > 0) {
        setProducts(listingsRes);
      }
      if (Array.isArray(couponsRes) && couponsRes.length > 0) {
        setCoupons(couponsRes);
      }
    } catch (e) {
      console.warn("Public catalog sync note:", e.message);
    } finally {
      setProductsLoading(false);
    }
  };

  // Single Source of Truth: Supabase Cloud DB se live data sync karne ke liye (Admin / DR only)
  const fetchCloudData = async () => {
    if (!isAdminOrDr) {
      return fetchPublicCatalog();
    }

    try {
      if (userRole === "admin") {
        authFetch(`${API_BASE_URL}/api/v1/users`)
          .then((r) => r.json())
          .then((u) => {
            if (Array.isArray(u) && u.length > 0) {
              localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(u));
              setUsers((prev) => (JSON.stringify(prev) === JSON.stringify(u) ? prev : u));
            }
          })
          .catch(() => {});
      }

      const syncRes = await authFetch(`${API_BASE_URL}/api/v1/cloud-sync`).then((r) => r.json()).catch(() => null);
      if (!syncRes) return;

      const { drs: drsRes, vendors: vendorsRes, masterProducts: masterRes, categories: categoriesRes, regions: regionsRes, orders: ordersRes, listings: listingsRes, coupons: couponsRes } = syncRes;

      if (couponsRes && Array.isArray(couponsRes)) {
        localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(couponsRes));
        setCoupons((prev) => (JSON.stringify(prev) === JSON.stringify(couponsRes) ? prev : couponsRes));
      }

      if (drsRes && Array.isArray(drsRes)) {
        const formattedDrs = drsRes.map((d) => ({
          id: d.id,
          name: d.name,
          phone: d.phone,
          regionId: d.regionId,
          regionName: d.region?.name || "Varanasi",
          status: d.status || "ACTIVE",
          vendorCount: 2,
          productCount: 8,
          joinedOn: d.joinedOn ? d.joinedOn.split("T")[0] : "2026-05-10",
        }));
        localStorage.setItem(DRS_STORAGE_KEY, JSON.stringify(formattedDrs));
        setDrs((prev) => (JSON.stringify(prev) === JSON.stringify(formattedDrs) ? prev : formattedDrs));
      }

      if (vendorsRes && Array.isArray(vendorsRes)) {
        const formattedVendors = vendorsRes.map((v) => {
          const resolvedRegName = v.regionName || v.districtName || v.region?.name || (v.regionId === "r2" ? "Mirzapur" : "Varanasi");
          return {
            id: v.id,
            shopName: v.shopName,
            ownerName: v.ownerName,
            phone: v.phone,
            regionId: v.regionId,
            regionName: resolvedRegName,
            districtName: resolvedRegName,
            status: v.status || "APPROVED",
            commissionRate: Number(v.commissionRate) || 10,
            productCount: Array.isArray(v.vendorProducts) ? v.vendorProducts.length : (v.user?.productCount || 0),
            joinedOn: v.joinedOn ? v.joinedOn.split("T")[0] : "2026-03-12",
            addedByDr: v.addedByDr || "Admin",
          };
        });

        setVendors((prev) => {
          localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify(formattedVendors));
          return JSON.stringify(prev) === JSON.stringify(formattedVendors) ? prev : formattedVendors;
        });
      }

      if (masterRes && Array.isArray(masterRes)) {
        const formattedMaster = masterRes.map((m) => ({
          id: m.id,
          name: m.name,
          categoryId: m.categoryId,
          categoryName: m.category?.name || "General",
          brand: m.brand || "Generic",
          type: m.type || "Standard",
          grade: m.grade || "Standard Grade",
          unit: m.unit || "Unit",
          suggestedPrice: Number(m.suggestedPrice) || 100,
          imageUrl: m.imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
          addedBy: m.addedBy || "Admin",
        }));
        setMasterProducts((prev) => (JSON.stringify(prev) === JSON.stringify(formattedMaster) ? prev : formattedMaster));
      }

      if (categoriesRes && Array.isArray(categoriesRes)) {
        const formattedCats = categoriesRes.map((c) => ({
          id: c.id,
          name: c.name,
          productCount: c.productCount || 0,
          isActive: c.isActive !== false,
        }));

        const map = new Map();
        formattedCats.forEach((c) => {
          map.set(c.name.toLowerCase().trim(), c);
        });
        const deduplicated = Array.from(map.values());
        setCategories(deduplicated);
        localStorage.setItem(CATS_STORAGE_KEY, JSON.stringify(deduplicated));
        window.dispatchEvent(new Event("buildcity_categories_updated"));
      }

      let fetchedRegsList = regionsRes;
      if (!Array.isArray(fetchedRegsList) || fetchedRegsList.length === 0) {
        fetchedRegsList = await authFetch(`${API_BASE_URL}/api/v1/regions`).then((r) => r.json()).catch(() => []);
      }

      if (Array.isArray(fetchedRegsList) && fetchedRegsList.length > 0) {
        const formattedRegs = fetchedRegsList.map((r) => ({
          id: r.id,
          name: r.name,
          state: r.state || "Uttar Pradesh",
          baseDeliveryCharge: Number(r.baseDeliveryCharge) || 49,
          isActive: r.isActive !== false,
        }));

        const map = new Map();
        formattedRegs.forEach((r) => {
          map.set(r.name.toLowerCase().trim(), r);
        });
        const deduplicated = Array.from(map.values());
        setRegions(deduplicated);
        localStorage.setItem(REGS_STORAGE_KEY, JSON.stringify(deduplicated));
        window.dispatchEvent(new Event("buildcity_regions_updated"));
      }

      let fetchedOrders = ordersRes;
      if (!Array.isArray(fetchedOrders) || fetchedOrders.length === 0) {
        fetchedOrders = await authFetch(`${API_BASE_URL}/api/v1/orders`).then((r) => r.json()).catch(() => []);
      }
      if (Array.isArray(fetchedOrders) && fetchedOrders.length > 0) {
        setOrders((prev) => (JSON.stringify(prev) === JSON.stringify(fetchedOrders) ? prev : fetchedOrders));
      }

      if (listingsRes && Array.isArray(listingsRes)) {
        const formattedListings = listingsRes.map((l) => {
          const matchedVendor = l.vendorId
            ? vendorsRes?.find((v) => String(v.id).toLowerCase() === String(l.vendorId).toLowerCase())
            : null;
          const isVendorSuspended = (matchedVendor && matchedVendor.status === "SUSPENDED") || (l.vendor && l.vendor.status === "SUSPENDED");
          const resolvedRegionName = l.regionName || l.districtName || l.vendor?.region?.name || matchedVendor?.region?.name || matchedVendor?.regionName || "Mirzapur";
          const resolvedRegionId = l.regionId || l.vendor?.regionId || matchedVendor?.regionId || matchedVendor?.region?.id || "mirzapur";
          const isListingApproved = l.approvalStatus === "APPROVED" || !l.approvalStatus || l.approvalStatus === "";

          return {
            id: l.id,
            masterProductId: l.masterProductId,
            name: l.name || l.masterProduct?.name || "Product",
            categoryId: l.categoryId || l.masterProduct?.categoryId,
            categoryName: l.categoryName || l.masterProduct?.category?.name || "Material",
            brand: l.brand || l.masterProduct?.brand || "Generic",
            type: l.type || l.masterProduct?.type || "Standard",
            grade: l.grade || l.masterProduct?.grade || "Standard Grade",
            unit: l.unit || l.masterProduct?.unit || "Unit",
            vendorId: l.vendorId,
            vendorName: l.vendor?.shopName || matchedVendor?.shopName || l.vendorName || "District Vendor",
            regionId: resolvedRegionId,
            regionName: resolvedRegionName,
            districtName: resolvedRegionName,
            price: Number(l.price) || 100,
            stockQty: Number(l.stockQty) || 100,
            imageUrl: l.imageUrl || l.masterProduct?.imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=500&q=80",
            approvalStatus: l.approvalStatus || "APPROVED",
            isActive: isListingApproved && l.isActive !== false && !isVendorSuspended,
            isVendorSuspended: Boolean(isVendorSuspended),
            addedBy: l.addedBy || "Vendor",
          };
        });
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(formattedListings));
        setProducts((prev) => {
          const prevMap = new Map(prev.map((p) => [p.id, p]));
          let hasChanged = prev.length !== formattedListings.length;

          const merged = formattedListings.map((f) => {
            const p = prevMap.get(f.id);
            if (!p) {
              hasChanged = true;
              return f;
            }
            if (
              p.approvalStatus !== f.approvalStatus ||
              p.price !== f.price ||
              p.stockQty !== f.stockQty ||
              p.isActive !== f.isActive ||
              p.name !== f.name ||
              p.vendorName !== f.vendorName
            ) {
              hasChanged = true;
              return f;
            }
            return p;
          });

          return hasChanged ? merged : prev;
        });
      }
    } catch (err) {
      console.warn("Cloud sync note:", err.message);
    } finally {
      setProductsLoading(false);
    }
  };

  // Continuous Live Auto Polling (6s) & Tab Storage Sync from Supabase Cloud DB
  useEffect(() => {
    fetchCloudData();
    const interval = setInterval(fetchCloudData, 6000);

    const handleStorage = () => fetchCloudData();
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const addDr = async (drData) => {
    const regionObj = regions.find((r) => r.id === drData.regionId) || {};
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/drs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: drData.name,
          phone: drData.phone.trim(),
          password: drData.password ? drData.password.trim() : "dr123",
          regionId: drData.regionId,
        }),
      });
      if (res.ok) {
        await fetchCloudData();
        return;
      }
    } catch {}

    const newDr = {
      id: "dr-" + Date.now(),
      name: drData.name,
      phone: drData.phone.trim(),
      password: drData.password ? drData.password.trim() : "dr123",
      regionId: drData.regionId,
      regionName: regionObj.name || drData.regionName || "General",
      status: "ACTIVE",
      vendorCount: 0,
      productCount: 0,
      joinedOn: new Date().toISOString().split("T")[0],
    };
    setDrs((prev) => [newDr, ...prev]);
    return newDr;
  };

  const updateDr = async (id, drData) => {
    const regionObj = regions.find((r) => r.id === drData.regionId) || {};
    const newRegName = regionObj.name || drData.regionName || "General";

    setDrs((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              name: drData.name || d.name,
              phone: drData.phone || d.phone,
              password: drData.password || d.password,
              regionId: drData.regionId || d.regionId,
              regionName: newRegName,
            }
          : d
      )
    );

    try {
      await authFetch(`${API_BASE_URL}/api/v1/drs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: drData.name,
          phone: drData.phone,
          password: drData.password ? drData.password.trim() : undefined,
          regionId: drData.regionId,
        }),
      });
      await fetchCloudData();
    } catch (err) {
      console.warn("Update DR error:", err.message);
    }
  };

  const toggleDrActive = async (id) => {
    let nextStatus = "ACTIVE";
    setDrs((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          nextStatus = d.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );

    try {
      await authFetch(`${API_BASE_URL}/api/v1/drs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchCloudData();
    } catch {}
  };

  const removeDr = async (id) => {
    setDrs((prev) => prev.filter((d) => d.id !== id));
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/drs/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCloudData();
      }
    } catch (err) {
      console.warn("Delete DR error:", err.message);
    }
  };

  const addVendor = async (vendorData) => {
    const regionObj = regions.find((r) => r.id === vendorData.regionId || r.name?.toLowerCase() === (vendorData.regionName || "").toLowerCase()) || {};
    const targetRegionName = regionObj.name || vendorData.regionName || vendorData.districtName || "Mirzapur";

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: vendorData.shopName,
          ownerName: vendorData.ownerName,
          phone: vendorData.phone,
          regionId: vendorData.regionId,
          regionName: targetRegionName,
          districtName: targetRegionName,
          commissionRate: vendorData.commissionRate,
          addedByDr: vendorData.addedByDr,
        }),
      });
      if (res.ok) {
        const createdV = await res.json();
        await fetchCloudData();
        return createdV;
      }
    } catch {}

    const newVendor = {
      id: "v-" + Date.now(),
      shopName: vendorData.shopName,
      ownerName: vendorData.ownerName,
      phone: vendorData.phone,
      regionId: vendorData.regionId || "r1",
      regionName: regionObj.name || vendorData.regionName || "Varanasi",
      status: "APPROVED",
      commissionRate: vendorData.commissionRate || 10,
      productCount: 0,
      joinedOn: new Date().toISOString().split("T")[0],
      addedByDr: vendorData.addedByDr || "System",
    };
    setVendors((prev) => [newVendor, ...prev]);
    return newVendor;
  };

  const updateVendor = async (id, vendorData) => {
    setVendors((prev) => {
      const updatedList = prev.map((v) =>
        v.id === id
          ? {
              ...v,
              shopName: vendorData.shopName || v.shopName,
              ownerName: vendorData.ownerName || v.ownerName,
              phone: vendorData.phone || v.phone,
              password: vendorData.password || v.password,
              commissionRate: vendorData.commissionRate !== undefined ? vendorData.commissionRate : v.commissionRate,
              status: vendorData.status || v.status,
            }
          : v
      );
      try {
        localStorage.setItem("buildcity_admin_vendors", JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: vendorData.shopName,
          ownerName: vendorData.ownerName,
          phone: vendorData.phone,
          password: vendorData.password,
          commissionRate: vendorData.commissionRate,
          status: vendorData.status,
        }),
      });

      if (res.ok) {
        const updatedApiV = await res.json();
        setVendors((prev) => {
          const freshList = prev.map((v) => (v.id === id ? { ...v, ...updatedApiV, password: vendorData.password || v.password } : v));
          try {
            localStorage.setItem("buildcity_admin_vendors", JSON.stringify(freshList));
          } catch {}
          return freshList;
        });
        await fetchCloudData();
      }
    } catch (err) {
      console.warn("Update vendor error:", err.message);
    }
  };

  const setVendorStatus = async (id, status) => {
    // 1. Immediately update vendors state & localStorage
    setVendors((prev) => {
      const updated = prev.map((v) => (v.id === id ? { ...v, status } : v));
      try {
        localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Immediately update products state & localStorage
    setProducts((prev) => {
      const targetVendor = vendors.find((v) => v.id === id);
      const targetShop = (targetVendor?.shopName || "").toLowerCase().trim();

      const updated = prev.map((p) => {
        const pShop = (p.vendorName || "").toLowerCase().trim();
        if (p.vendorId === id || (pShop && targetShop && pShop === targetShop)) {
          const isSusp = status === "SUSPENDED";
          return { ...p, isVendorSuspended: isSusp, isActive: !isSusp && p.approvalStatus === "APPROVED" };
        }
        return p;
      });
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 3. Patch backend DB
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/vendors/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updatedApiV = await res.json();
        setVendors((prev) => {
          const fresh = prev.map((v) => (v.id === id ? { ...v, ...updatedApiV, status } : v));
          try {
            localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify(fresh));
          } catch {}
          return fresh;
        });
      }
    } catch (err) {
      console.warn("Set vendor status error:", err.message);
    }
  };

  const removeVendor = async (id) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/vendors/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCloudData();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn("Delete vendor warning:", errData);
      }
    } catch (err) {
      console.warn("Delete vendor network error:", err.message);
    }
  };

  const addCategory = async (categoryData) => {
    const newCat = {
      id: "c-" + Date.now(),
      name: categoryData.name,
      productCount: 0,
      isActive: true,
    };

    setCategories((prev) => {
      const updated = [newCat, ...prev];
      localStorage.setItem(CATS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_categories_updated"));
      return updated;
    });

    try {
      await authFetch(`${API_BASE_URL}/api/v1/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryData),
      });
      fetchCloudData();
    } catch {}

    return newCat;
  };

  const updateCategory = async (id, updates) => {
    setCategories((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      localStorage.setItem(CATS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_categories_updated"));
      return updated;
    });
    try {
      await authFetch(`${API_BASE_URL}/api/v1/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn("Update category note:", err.message);
    }
  };

  const removeCategory = async (catTarget) => {
    const catId = typeof catTarget === "object" ? catTarget.id : catTarget;
    const catName = typeof catTarget === "object" ? catTarget.name : null;

    setCategories((prev) => {
      const updated = prev.filter((c) => {
        if (catId && c.id === catId) return false;
        if (catName && c.name.toLowerCase().trim() === catName.toLowerCase().trim()) return false;
        return true;
      });
      localStorage.setItem(CATS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_categories_updated"));
      return updated;
    });

    try {
      const targetParam = catId || catName;
      if (targetParam) {
        await authFetch(`${API_BASE_URL}/api/v1/categories/${encodeURIComponent(targetParam)}`, {
          method: "DELETE",
        });
      }
    } catch (err) {
      console.warn("Delete category note:", err.message);
    }
  };

  const toggleCategoryActive = (catTarget) => {
    const catId = typeof catTarget === "object" ? catTarget.id : catTarget;
    const catName = typeof catTarget === "object" ? catTarget.name : null;

    let nextState = true;
    setCategories((prev) => {
      const target = prev.find((c) => (catId && c.id === catId) || (catName && c.name.toLowerCase().trim() === catName.toLowerCase().trim()));
      nextState = target ? (target.isActive === false ? true : false) : true;
      const updated = prev.map((c) => {
        if ((catId && c.id === catId) || (catName && c.name.toLowerCase().trim() === catName.toLowerCase().trim())) {
          return { ...c, isActive: nextState };
        }
        return c;
      });
      localStorage.setItem(CATS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_categories_updated"));
      return updated;
    });

    const targetParam = catId || catName;
    if (targetParam) {
      authFetch(`${API_BASE_URL}/api/v1/categories/${encodeURIComponent(targetParam)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      }).catch((err) => console.warn("Toggle category DB note:", err.message));
    }
  };

  const addRegion = async (regionData) => {
    const payload = {
      name: regionData.name,
      state: regionData.state || "Uttar Pradesh",
      baseDeliveryCharge: Number(regionData.baseDeliveryCharge) || 49,
      isActive: true,
    };

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/regions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const savedDbReg = await res.json();
        setRegions((prev) => {
          const filtered = prev.filter((r) => r.name.toLowerCase().trim() !== payload.name.toLowerCase().trim());
          const updated = [savedDbReg, ...filtered];
          localStorage.setItem(REGS_STORAGE_KEY, JSON.stringify(updated));
          window.dispatchEvent(new Event("buildcity_regions_updated"));
          return updated;
        });
        return savedDbReg;
      }
    } catch (err) {
      console.warn("DB Region save note:", err.message);
    }

    const fallbackReg = {
      id: "r-" + Date.now(),
      ...payload,
    };

    setRegions((prev) => {
      const filtered = prev.filter((r) => r.name.toLowerCase().trim() !== payload.name.toLowerCase().trim());
      const updated = [fallbackReg, ...filtered];
      localStorage.setItem(REGS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_regions_updated"));
      return updated;
    });

    return fallbackReg;
  };

  const updateRegion = async (id, updates) => {
    setRegions((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      localStorage.setItem(REGS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_regions_updated"));
      return updated;
    });
    try {
      await authFetch(`${API_BASE_URL}/api/v1/regions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn("Update region note:", err.message);
    }
  };

  const removeRegion = async (regTarget) => {
    const regId = typeof regTarget === "object" ? regTarget.id : regTarget;
    const regName = typeof regTarget === "object" ? regTarget.name : null;

    setRegions((prev) => {
      const updated = prev.filter((r) => {
        if (regId && r.id === regId) return false;
        if (regName && r.name.toLowerCase().trim() === regName.toLowerCase().trim()) return false;
        return true;
      });
      localStorage.setItem(REGS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_regions_updated"));
      return updated;
    });

    try {
      if (regId) {
        await authFetch(`${API_BASE_URL}/api/v1/regions/${regId}`, {
          method: "DELETE",
        });
      }
    } catch (err) {
      console.warn("Delete region note:", err.message);
    }
  };

  const toggleRegionActive = (regTarget) => {
    const regId = typeof regTarget === "object" ? regTarget.id : regTarget;
    const regName = typeof regTarget === "object" ? regTarget.name : null;

    let nextState = true;
    setRegions((prev) => {
      const target = prev.find((r) => (regId && r.id === regId) || (regName && r.name.toLowerCase().trim() === regName.toLowerCase().trim()));
      nextState = target ? (target.isActive === false ? true : false) : true;
      const updated = prev.map((r) => {
        if ((regId && r.id === regId) || (regName && r.name.toLowerCase().trim() === regName.toLowerCase().trim())) {
          return { ...r, isActive: nextState };
        }
        return r;
      });
      localStorage.setItem(REGS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_regions_updated"));
      return updated;
    });

    const targetParam = regId || regName;
    if (targetParam) {
      authFetch(`${API_BASE_URL}/api/v1/regions/${encodeURIComponent(targetParam)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      }).catch((err) => console.warn("Toggle region DB note:", err.message));
    }
  };

  const addCoupon = async (couponData) => {
    const cleanCode = (couponData.code || "").trim().toUpperCase();
    const payload = {
      code: cleanCode,
      title: couponData.title ? couponData.title.trim() : `Flat ₹${couponData.discountAmount || 100} OFF`,
      discountAmount: Number(couponData.discountAmount) || 100,
      minOrder: Number(couponData.minOrder) || 1000,
      expiryDate: couponData.expiryDate || "2026-12-31",
      desc: couponData.desc || `Valid on orders above ₹${couponData.minOrder || 1000}`,
      isActive: couponData.isActive !== false,
    };

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const savedDbCp = await res.json();
        setCoupons((prev) => {
          const filtered = prev.filter((c) => c.code !== cleanCode);
          const updated = [savedDbCp, ...filtered];
          localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(updated));
          window.dispatchEvent(new Event("buildcity_coupons_updated"));
          return updated;
        });
        return savedDbCp;
      }
    } catch (err) {
      console.warn("DB Coupon save note:", err.message);
    }

    const fallbackCp = {
      id: "cp-" + Date.now(),
      ...payload,
    };

    setCoupons((prev) => {
      const filtered = prev.filter((c) => c.code !== cleanCode);
      const updated = [fallbackCp, ...filtered];
      localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_coupons_updated"));
      return updated;
    });

    return fallbackCp;
  };

  const updateCoupon = async (id, updates) => {
    setCoupons((prev) => {
      const updated = prev.map((c) => (c.id === id || c.code === id ? { ...c, ...updates } : c));
      localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_coupons_updated"));
      return updated;
    });
    try {
      await authFetch(`${API_BASE_URL}/api/v1/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn("Update coupon note:", err.message);
    }
  };

  const toggleCouponActive = (target) => {
    const cpId = typeof target === "object" ? target.id : target;
    const cpCode = typeof target === "object" ? target.code : null;

    let nextState = true;
    setCoupons((prev) => {
      const item = prev.find((c) => (cpId && c.id === cpId) || (cpCode && c.code === cpCode));
      nextState = item ? (item.isActive === false ? true : false) : true;
      const updated = prev.map((c) => {
        if ((cpId && c.id === cpId) || (cpCode && c.code === cpCode)) {
          return { ...c, isActive: nextState };
        }
        return c;
      });
      localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_coupons_updated"));
      return updated;
    });

    const param = cpId || cpCode;
    if (param) {
      authFetch(`${API_BASE_URL}/api/v1/coupons/${encodeURIComponent(param)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      }).catch(() => {});
    }
  };

  const removeCoupon = async (target) => {
    const cpId = typeof target === "object" ? target.id : target;
    const cpCode = typeof target === "object" ? target.code : null;

    setCoupons((prev) => {
      const updated = prev.filter((c) => {
        if (cpId && c.id === cpId) return false;
        if (cpCode && c.code === cpCode) return false;
        return true;
      });
      localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("buildcity_coupons_updated"));
      return updated;
    });

    const param = cpId || cpCode;
    if (param) {
      try {
        await authFetch(`${API_BASE_URL}/api/v1/coupons/${encodeURIComponent(param)}`, {
          method: "DELETE",
        });
      } catch {}
    }
  };

  const addMasterProduct = async (mpData) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/master-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mpData),
      });
      if (res.ok) {
        await fetchCloudData();
        return;
      }
    } catch {}

    const catObj = categories.find((c) => c.id === mpData.categoryId) || {};
    const newMp = {
      id: mpData.id || "mp-" + Date.now(),
      name: mpData.name,
      categoryId: mpData.categoryId || "c1",
      categoryName: catObj.name || mpData.categoryName || "General",
      brand: mpData.brand || "Generic",
      type: mpData.type || "Standard",
      grade: mpData.grade || "Standard Grade",
      unit: mpData.unit || "Unit",
      suggestedPrice: Number(mpData.suggestedPrice) || 100,
      imageUrl: mpData.imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
      addedBy: mpData.addedBy || "Admin",
    };
    setMasterProducts((prev) => [newMp, ...prev]);
    return newMp;
  };

  const updateMasterProduct = async (id, updates) => {
    const targetPrice = Number(updates.suggestedPrice !== undefined ? updates.suggestedPrice : updates.price);

    setMasterProducts((prev) =>
      prev.map((mp) => (mp.id === id ? { ...mp, ...updates, suggestedPrice: !isNaN(targetPrice) && targetPrice > 0 ? targetPrice : mp.suggestedPrice } : mp))
    );

    if (!isNaN(targetPrice) && targetPrice > 0) {
      setProducts((prev) =>
        prev.map((p) => (p.masterProductId === id || p.id === id ? { ...p, price: targetPrice, suggestedPrice: targetPrice } : p))
      );
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/master-products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updates,
          suggestedPrice: !isNaN(targetPrice) ? targetPrice : undefined,
        }),
      });

      if (res.ok) {
        await fetchCloudData();
      }
    } catch (err) {
      console.warn("Update master product error:", err.message);
    }
  };

  const assignMasterProductToVendor = async ({ masterProductId, vendorId, vendorName, regionId, regionName, districtName, price, stockQty, addedBy }) => {
    const matchedVendor = vendors.find((v) => v.id === vendorId || (vendorName && (v.shopName || "").toLowerCase() === vendorName.toLowerCase()));
    const regName = regionName || districtName || matchedVendor?.regionName || matchedVendor?.districtName || matchedVendor?.region?.name || "Mirzapur";
    const validUuidRegionId = (regionId && regionId.length > 10) ? regionId : (matchedVendor?.regionId && matchedVendor.regionId.length > 10) ? matchedVendor.regionId : undefined;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/vendor/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterProductId, vendorId, vendorName, regionId: validUuidRegionId, regionName: regName, districtName: regName, price, stockQty, addedBy }),
      });
      if (res.ok) {
        await fetchCloudData();
        return;
      }
    } catch {}

    const mp = masterProducts.find((m) => m.id === masterProductId);
    const newListing = {
      id: "p-" + Date.now(),
      masterProductId: masterProductId || mp?.id,
      name: mp ? mp.name : "Construction Material Product",
      categoryId: mp ? mp.categoryId : "c1",
      categoryName: mp ? mp.categoryName : "General",
      brand: mp ? mp.brand : "Generic",
      type: mp ? mp.type : "Standard",
      grade: mp ? mp.grade : "Standard Grade",
      unit: mp ? mp.unit : "Unit",
      vendorId: vendorId || ("v-" + Date.now()),
      vendorName: vendorName || "District Vendor",
      regionId: regionId || "r1",
      regionName: regName,
      districtName: regName,
      price: Number(price) || (mp ? mp.suggestedPrice : 100),
      stockQty: Number(stockQty) || 100,
      imageUrl: mp ? mp.imageUrl : "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
      isActive: (addedBy === "Admin" || addedBy === "DR") ? true : false,
      approvalStatus: (addedBy === "Admin" || addedBy === "DR") ? "APPROVED" : "PENDING_REVIEW",
      addedBy: addedBy || "Vendor",
    };
    setProducts((prev) => [newListing, ...prev]);
    return newListing;
  };

  const updateVendorProductListing = async (id, updates) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/vendor/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        await fetchCloudData();
      }
    } catch (err) {
      console.warn("Live listing price update note:", err.message);
    }
  };

  const removeVendorProductListing = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateListingApprovalStatus = async (id, approvalStatus) => {
    // 1. Instant optimistic UI update strictly for targeted item ID
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, approvalStatus, isActive: approvalStatus === "APPROVED" } : p))
    );

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/vendor/listings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus }),
      });

      if (res.ok) {
        const updatedItem = await res.json().catch(() => null);
        if (updatedItem) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === id || (updatedItem.id && p.id === updatedItem.id)
                ? {
                    ...p,
                    approvalStatus: updatedItem.approvalStatus || approvalStatus,
                    isActive: updatedItem.isActive !== undefined ? updatedItem.isActive : (approvalStatus === "APPROVED"),
                  }
                : p
            )
          );
        }
      }
    } catch (err) {
      console.warn("Live status update note:", err.message);
    }
  };

  const stats = {
    totalRevenue: orders.reduce((sum, o) => sum + (Number(o.totalAmount || o.total || o.amount) || 0), 0),
    approvedVendors: vendors.filter((v) => v.status === "APPROVED").length,
    pendingVendors: vendors.filter((v) => v.status === "PENDING").length,
    activeVendors: vendors.filter((v) => v.status === "APPROVED").length,
    activeDrs: drs.filter((d) => d.status === "ACTIVE").length,
    totalMasterProducts: masterProducts.length,
    totalListings: products.length,
    totalOrders: orders.length,
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchCloudData();
        return;
      }
    } catch {}

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
  };

  const clearAllVendorsAndProducts = async () => {
    setVendors([]);
    setProducts([]);
    try {
      await authFetch(`${API_BASE_URL}/api/v1/clear-vendors`, { method: "DELETE" });
      await fetchCloudData();
    } catch {}
  };

  return (
    <AdminContext.Provider
      value={{
        drs,
        vendors,
        users,
        orders,
        categories,
        regions,
        users,
        coupons,
        masterProducts,
        products,
        productsLoading,
        stats,
        addDr,
        updateDr,
        removeDr,
        toggleDrActive,
        addVendor,
        updateVendor,
        setVendorStatus,
        removeVendor,
        clearAllVendorsAndProducts,
        addCategory,
        updateCategory,
        removeCategory,
        toggleCategoryActive,
        addRegion,
        updateRegion,
        removeRegion,
        toggleRegionActive,
        addCoupon,
        updateCoupon,
        toggleCouponActive,
        removeCoupon,
        addMasterProduct,
        updateMasterProduct,
        assignMasterProductToVendor,
        updateVendorProductListing,
        removeVendorProductListing,
        updateListingApprovalStatus,
        updateOrderStatus,
        fetchCloudData,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}