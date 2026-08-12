import { createContext, useContext, useEffect, useState } from "react";

const AdminContext = createContext(null);
const STORAGE_KEY = "buildcity_admin";

// TEMPORARY MOCK — replace with GET /api/v1/admin/vendors, /categories,
// /regions once backend jab ban jayega .
const seedVendors = [
  { id: "v1", shopName: "Shree Cement Traders", ownerName: "Rakesh Gupta", phone: "9876543210", status: "APPROVED", commissionRate: 10, productCount: 24, joinedOn: "2026-03-12" },
  { id: "v2", shopName: "Asian Paints Hub", ownerName: "Sunita Verma", phone: "9876501234", status: "APPROVED", commissionRate: 12, productCount: 18, joinedOn: "2026-04-02" },
  { id: "v3", shopName: "SteelMart UP", ownerName: "Vikram Singh", phone: "9812345678", status: "PENDING", commissionRate: 10, productCount: 0, joinedOn: "2026-08-05" },
  { id: "v4", shopName: "BuildFast Hardware", ownerName: "Anil Kumar", phone: "9898989898", status: "PENDING", commissionRate: 10, productCount: 0, joinedOn: "2026-08-09" },
  { id: "v5", shopName: "Ganga Sanitary Store", ownerName: "Mohan Lal", phone: "9765432109", status: "SUSPENDED", commissionRate: 10, productCount: 12, joinedOn: "2026-02-18" },
];

const seedOrders = [
  { id: "BC48213", customer: "Amit Sharma", vendor: "Shree Cement Traders", amount: 3560, status: "Delivered", date: "2026-08-08" },
  { id: "BC48219", customer: "Priya Yadav", vendor: "Asian Paints Hub", amount: 2250, status: "Shipped", date: "2026-08-10" },
  { id: "BC48225", customer: "Rakesh Tiwari", vendor: "SteelMart UP", amount: 8900, status: "Pending", date: "2026-08-11" },
  { id: "BC48230", customer: "Neha Singh", vendor: "Ganga Sanitary Store", amount: 1450, status: "Cancelled", date: "2026-08-11" },
];

const seedCategories = [
  { id: "c1", name: "Cement", gstRate: 28, productCount: 120, isActive: true },
  { id: "c2", name: "Paints", gstRate: 18, productCount: 150, isActive: true },
  { id: "c3", name: "Steel", gstRate: 18, productCount: 100, isActive: true },
  { id: "c4", name: "Plumbing", gstRate: 18, productCount: 80, isActive: true },
  { id: "c5", name: "Electrical", gstRate: 18, productCount: 120, isActive: true },
];

const seedRegions = [
  { id: "r1", name: "Varanasi", state: "Uttar Pradesh", baseDeliveryCharge: 49, isActive: true },
  { id: "r2", name: "Mirzapur", state: "Uttar Pradesh", baseDeliveryCharge: 79, isActive: true },
  { id: "r3", name: "Prayagraj", state: "Uttar Pradesh", baseDeliveryCharge: 69, isActive: true },
  { id: "r4", name: "Jaunpur", state: "Uttar Pradesh", baseDeliveryCharge: 89, isActive: true },
];

const seedProducts = [
  { id: "p1", name: "UltraTech Cement 50kg", categoryId: "c1", vendorId: "v1", price: 390, stockQty: 500, isActive: true },
  { id: "p2", name: "Asian Paints Royale 20L", categoryId: "c2", vendorId: "v2", price: 2250, stockQty: 60, isActive: true },
  { id: "p3", name: "TMT Steel Bar 12mm", categoryId: "c3", vendorId: "v3", price: 650, stockQty: 200, isActive: true },
];

function loadOrSeed(key, seed) {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return seed;
    }
  }
  return seed;
}

export function AdminProvider({ children }) {
  const [vendors, setVendors] = useState(() => loadOrSeed(STORAGE_KEY + "_vendors", seedVendors));
  const [orders] = useState(() => loadOrSeed(STORAGE_KEY + "_orders", seedOrders));
  const [categories, setCategories] = useState(() => loadOrSeed(STORAGE_KEY + "_categories", seedCategories));
  const [regions, setRegions] = useState(() => loadOrSeed(STORAGE_KEY + "_regions", seedRegions));
  const [products, setProducts] = useState(() => loadOrSeed(STORAGE_KEY + "_products", seedProducts));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + "_vendors", JSON.stringify(vendors));
  }, [vendors]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + "_categories", JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + "_regions", JSON.stringify(regions));
  }, [regions]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + "_products", JSON.stringify(products));
  }, [products]);

  // TEMPORARY MOCK — replace with PUT /api/v1/admin/vendors/:id/status
  const setVendorStatus = (id, status) => {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
  };

  const addCategory = (cat) => {
    setCategories((prev) => [
      ...prev,
      { id: "c-" + Date.now(), productCount: 0, isActive: true, ...cat },
    ]);
  };

  const toggleCategoryActive = (id) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const addRegion = (region) => {
    setRegions((prev) => [
      ...prev,
      { id: "r-" + Date.now(), isActive: true, ...region },
    ]);
  };

  const toggleRegionActive = (id) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const addProduct = (product) => {
    setProducts((prev) => [
      ...prev,
      { id: "p-" + Date.now(), isActive: true, ...product },
    ]);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === product.categoryId ? { ...c, productCount: c.productCount + 1 } : c
      )
    );
  };

  const toggleProductActive = (id) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  };

  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + o.amount, 0),
    approvedVendors: vendors.filter((v) => v.status === "APPROVED").length,
    pendingVendors: vendors.filter((v) => v.status === "PENDING").length,
    activeProducts: categories.reduce((sum, c) => sum + c.productCount, 0),
  };

  return (
    <AdminContext.Provider
      value={{
        vendors,
        orders,
        categories,
        regions,
        products,
        stats,
        setVendorStatus,
        addCategory,
        toggleCategoryActive,
        addRegion,
        toggleRegionActive,
        addProduct,
        toggleProductActive,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}