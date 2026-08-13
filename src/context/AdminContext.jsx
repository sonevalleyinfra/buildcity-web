import { createContext, useContext, useEffect, useState } from "react";

const AdminContext = createContext(null);
const STORAGE_KEY = "buildcity_admin";

// TEMPORARY MOCK — replace with GET /api/v1/admin/vendors, /categories,
// /regions once backend jab ban jayega .
const seedDrs = [
  {
    id: "dr1",
    name: "Ramesh Sharma",
    phone: "7777777777",
    regionId: "r1",
    regionName: "Varanasi",
    status: "ACTIVE",
    vendorCount: 2,
    productCount: 8,
    joinedOn: "2026-05-10",
  },
  {
    id: "dr2",
    name: "Suresh Patel",
    phone: "8888888888",
    regionId: "r2",
    regionName: "Mirzapur",
    status: "ACTIVE",
    vendorCount: 1,
    productCount: 4,
    joinedOn: "2026-06-15",
  },
];

const seedVendors = [
  { id: "v1", shopName: "Shree Cement Traders", ownerName: "Rakesh Gupta", phone: "9876543210", regionId: "r1", regionName: "Varanasi", status: "APPROVED", commissionRate: 10, productCount: 24, joinedOn: "2026-03-12", addedByDr: "Ramesh Sharma" },
  { id: "v2", shopName: "Asian Paints Hub", ownerName: "Sunita Verma", phone: "9876501234", regionId: "r1", regionName: "Varanasi", status: "APPROVED", commissionRate: 12, productCount: 18, joinedOn: "2026-04-02", addedByDr: "Ramesh Sharma" },
  { id: "v3", shopName: "SteelMart UP", ownerName: "Vikram Singh", phone: "9812345678", regionId: "r2", regionName: "Mirzapur", status: "PENDING", commissionRate: 10, productCount: 0, joinedOn: "2026-08-05", addedByDr: "Suresh Patel" },
  { id: "v4", shopName: "BuildFast Hardware", ownerName: "Anil Kumar", phone: "9898989898", regionId: "r3", regionName: "Prayagraj", status: "PENDING", commissionRate: 10, productCount: 0, joinedOn: "2026-08-09", addedByDr: "Admin" },
  { id: "v5", shopName: "Ganga Sanitary Store", ownerName: "Mohan Lal", phone: "9765432109", regionId: "r1", regionName: "Varanasi", status: "SUSPENDED", commissionRate: 10, productCount: 12, joinedOn: "2026-02-18", addedByDr: "Admin" },
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

const seedMasterProducts = [
  {
    id: "mp1",
    name: "UltraTech Super PPC Cement",
    categoryId: "c1",
    categoryName: "Cement",
    brand: "UltraTech",
    type: "PPC Cement",
    grade: "OPC 53 Grade",
    unit: "50kg Bag",
    suggestedPrice: 390,
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
    addedBy: "Admin",
  },
  {
    id: "mp2",
    name: "Ambuja Kawach Waterproof Cement",
    categoryId: "c1",
    categoryName: "Cement",
    brand: "Ambuja",
    type: "Waterproof PPC",
    grade: "OPC 53 Grade",
    unit: "50kg Bag",
    suggestedPrice: 410,
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
    addedBy: "Admin",
  },
  {
    id: "mp3",
    name: "Asian Paints Royale Luxury Emulsion",
    categoryId: "c2",
    categoryName: "Paints",
    brand: "Asian Paints",
    type: "Interior Emulsion",
    grade: "Premium Shine",
    unit: "20 Liter Bucket",
    suggestedPrice: 2250,
    imageUrl: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80",
    addedBy: "Ramesh Sharma (DR)",
  },
  {
    id: "mp4",
    name: "Berger Silk Glamor High Shine",
    categoryId: "c2",
    categoryName: "Paints",
    brand: "Berger",
    type: "Luxury Emulsion",
    grade: "Smooth Silk",
    unit: "20 Liter Bucket",
    suggestedPrice: 2150,
    imageUrl: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80",
    addedBy: "Admin",
  },
  {
    id: "mp5",
    name: "Tata Tiscon 550D TMT Rebar 12mm",
    categoryId: "c3",
    categoryName: "Steel",
    brand: "Tata Tiscon",
    type: "TMT Rebar",
    grade: "Fe 550D",
    unit: "12 Meter Rod",
    suggestedPrice: 650,
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80",
    addedBy: "Admin",
  },
  {
    id: "mp6",
    name: "Jindal Panther 550D TMT Bar 16mm",
    categoryId: "c3",
    categoryName: "Steel",
    brand: "Jindal Panther",
    type: "TMT Rebar",
    grade: "Fe 550D",
    unit: "12 Meter Rod",
    suggestedPrice: 890,
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80",
    addedBy: "Ramesh Sharma (DR)",
  },
  {
    id: "mp7",
    name: "Astral Silencio PVC Pipe 4 Inch",
    categoryId: "c4",
    categoryName: "Plumbing",
    brand: "Astral",
    type: "PVC Pipe",
    grade: "Class 2 / 6kg",
    unit: "10 Feet Pipe",
    suggestedPrice: 480,
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
    addedBy: "Admin",
  },
  {
    id: "mp8",
    name: "Supreme SWR CPVC Pipe 1 Inch",
    categoryId: "c4",
    categoryName: "Plumbing",
    brand: "Supreme",
    type: "CPVC Hot & Cold",
    grade: "SDR 11",
    unit: "10 Feet Pipe",
    suggestedPrice: 320,
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
    addedBy: "Admin",
  },
  {
    id: "mp9",
    name: "Finolex 1.5 sqmm Flame Retardant Wire",
    categoryId: "c5",
    categoryName: "Electrical",
    brand: "Finolex",
    type: "FR Copper Wire",
    grade: "90 Meter Coil",
    unit: "1 Coil",
    suggestedPrice: 1450,
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80",
    addedBy: "Admin",
  },
  {
    id: "mp10",
    name: "Havells Coral Modular 6A Switch",
    categoryId: "c5",
    categoryName: "Electrical",
    brand: "Havells",
    type: "Modular Switch",
    grade: "Heavy Duty 240V",
    unit: "1 Box (20 Pcs)",
    suggestedPrice: 580,
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80",
    addedBy: "Admin",
  },
];

const seedProducts = [
  {
    id: "p1",
    masterProductId: "mp1",
    name: "UltraTech Super PPC Cement",
    categoryId: "c1",
    categoryName: "Cement",
    brand: "UltraTech",
    type: "PPC Cement",
    grade: "OPC 53 Grade",
    unit: "50kg Bag",
    vendorId: "v1",
    vendorName: "Shree Cement Traders",
    price: 390,
    stockQty: 500,
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
    isActive: true,
    addedBy: "Ramesh Sharma (DR)"
  },
  {
    id: "p2",
    masterProductId: "mp3",
    name: "Asian Paints Royale Luxury Emulsion",
    categoryId: "c2",
    categoryName: "Paints",
    brand: "Asian Paints",
    type: "Interior Emulsion",
    grade: "Premium Shine",
    unit: "20 Liter Bucket",
    vendorId: "v2",
    vendorName: "Asian Paints Hub",
    price: 2250,
    stockQty: 60,
    imageUrl: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80",
    isActive: true,
    addedBy: "Ramesh Sharma (DR)"
  },
  {
    id: "p3",
    masterProductId: "mp5",
    name: "Tata Tiscon 550D TMT Rebar 12mm",
    categoryId: "c3",
    categoryName: "Steel",
    brand: "Tata Tiscon",
    type: "TMT Rebar",
    grade: "Fe 550D",
    unit: "12 Meter Rod",
    vendorId: "v3",
    vendorName: "SteelMart UP",
    price: 650,
    stockQty: 200,
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80",
    isActive: true,
    addedBy: "Admin"
  },
];

// Helper function: LocalStorage se data load karo, agar nahi mile toh default seed array return karo
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
  // Master Platform Data States - DRs, Vendors, Orders, Categories, Regions, Master Products, Vendor Listings
  const [drs, setDrs] = useState(() => loadOrSeed(STORAGE_KEY + "_drs", seedDrs));
  const [vendors, setVendors] = useState(() => loadOrSeed(STORAGE_KEY + "_vendors", seedVendors));
  const [orders] = useState(() => loadOrSeed(STORAGE_KEY + "_orders", seedOrders));
  const [categories, setCategories] = useState(() => loadOrSeed(STORAGE_KEY + "_categories", seedCategories));
  const [regions, setRegions] = useState(() => loadOrSeed(STORAGE_KEY + "_regions", seedRegions));
  const [masterProducts, setMasterProducts] = useState(() => loadOrSeed(STORAGE_KEY + "_master_products", seedMasterProducts));
  const [products, setProducts] = useState(() => loadOrSeed(STORAGE_KEY + "_products", seedProducts));

  // Auto-sync states to localStorage jab bhi data change ho
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + "_drs", JSON.stringify(drs));
  }, [drs]);
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
    localStorage.setItem(STORAGE_KEY + "_master_products", JSON.stringify(masterProducts));
  }, [masterProducts]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + "_products", JSON.stringify(products));
  }, [products]);

  // 1. Naya DR (District Representative) add karne wala function
  const addDr = (drData) => {
    const regionObj = regions.find((r) => r.id === drData.regionId) || {};
    const newDr = {
      id: "dr-" + Date.now(),
      name: drData.name,
      phone: drData.phone.trim(),
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

  // DR ko Active/Inactive toggle karne wala function
  const toggleDrActive = (id) => {
    setDrs((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : d
      )
    );
  };

  // 2. Naya Vendor add karne wala function (DR ya Admin dwara)
  const addVendor = (vendorData) => {
    const regionObj = regions.find((r) => r.id === vendorData.regionId) || {};
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

    if (vendorData.drId) {
      setDrs((prev) =>
        prev.map((d) => (d.id === vendorData.drId ? { ...d, vendorCount: d.vendorCount + 1 } : d))
      );
    }
    return newVendor;
  };

  // Vendor status (APPROVED, PENDING, SUSPENDED) set karne wala helper
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

  const addMasterProduct = (masterData) => {
    const catObj = categories.find((c) => c.id === masterData.categoryId) || {};
    const newMaster = {
      id: "mp-" + Date.now(),
      name: masterData.name,
      categoryId: masterData.categoryId,
      categoryName: catObj.name || masterData.categoryName || "General",
      brand: masterData.brand || "Generic",
      type: masterData.type || "Standard",
      grade: masterData.grade || "Standard Grade",
      unit: masterData.unit || "Unit",
      suggestedPrice: Number(masterData.suggestedPrice || masterData.price) || 100,
      imageUrl: masterData.imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
      addedBy: masterData.addedBy || "Admin",
    };

    setMasterProducts((prev) => [newMaster, ...prev]);

    // If DR/Admin assigned it directly to a vendor upon creation:
    if (masterData.vendorId) {
      assignMasterProductToVendor({
        masterProductId: newMaster.id,
        vendorId: masterData.vendorId,
        vendorName: masterData.vendorName,
        price: masterData.price || newMaster.suggestedPrice,
        stockQty: masterData.stockQty || 100,
        drId: masterData.drId,
        addedBy: masterData.addedBy,
      });
    }

    return newMaster;
  };

  const assignMasterProductToVendor = ({ masterProductId, vendorId, vendorName, price, stockQty, drId, addedBy }) => {
    const masterObj = masterProducts.find((mp) => mp.id === masterProductId) || {};
    const vendorObj = vendors.find((v) => v.id === vendorId) || {};

    const newProdListing = {
      id: "p-" + Date.now(),
      masterProductId: masterProductId || masterObj.id,
      name: masterObj.name || "Master Product",
      categoryId: masterObj.categoryId || "c1",
      categoryName: masterObj.categoryName || "General",
      brand: masterObj.brand || "Generic",
      type: masterObj.type || "Standard",
      grade: masterObj.grade || "Standard Grade",
      unit: masterObj.unit || "Unit",
      vendorId: vendorId,
      vendorName: vendorObj.shopName || vendorName || "Vendor Store",
      price: Number(price) || masterObj.suggestedPrice || 100,
      stockQty: Number(stockQty) || 0,
      imageUrl: masterObj.imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
      isActive: true,
      addedBy: addedBy || "Vendor Catalog Selection",
    };

    setProducts((prev) => [newProdListing, ...prev]);

    if (drId) {
      setDrs((prev) =>
        prev.map((d) => (d.id === drId ? { ...d, productCount: d.productCount + 1 } : d))
      );
    }

    return newProdListing;
  };

  const updateVendorProductListing = (productId, updates) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
  };

  const removeVendorProductListing = (productId) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const toggleProductActive = (id) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  };

  const updateDr = (id, updates) => {
    const regionObj = updates.regionId ? regions.find((r) => r.id === updates.regionId) || {} : {};
    setDrs((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              ...updates,
              regionName: regionObj.name || updates.regionName || d.regionName,
            }
          : d
      )
    );
  };

  const updateVendor = (id, updates) => {
    const regionObj = updates.regionId ? regions.find((r) => r.id === updates.regionId) || {} : {};
    setVendors((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              ...updates,
              regionName: regionObj.name || updates.regionName || v.regionName,
            }
          : v
      )
    );
  };

  const updateMasterProduct = (id, updates) => {
    const catObj = updates.categoryId ? categories.find((c) => c.id === updates.categoryId) || {} : {};
    setMasterProducts((prev) =>
      prev.map((mp) =>
        mp.id === id
          ? {
              ...mp,
              ...updates,
              categoryName: catObj.name || updates.categoryName || mp.categoryName,
            }
          : mp
      )
    );
  };

  const updateCategory = (id, updates) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const updateRegion = (id, updates) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + o.amount, 0),
    approvedVendors: vendors.filter((v) => v.status === "APPROVED").length,
    pendingVendors: vendors.filter((v) => v.status === "PENDING").length,
    activeProducts: products.length,
    masterProductsCount: masterProducts.length,
    totalDrs: drs.filter((d) => d.status === "ACTIVE").length,
  };

  return (
    <AdminContext.Provider
      value={{
        drs,
        vendors,
        orders,
        categories,
        regions,
        masterProducts,
        products,
        stats,
        addDr,
        updateDr,
        toggleDrActive,
        addVendor,
        updateVendor,
        setVendorStatus,
        addCategory,
        updateCategory,
        toggleCategoryActive,
        addRegion,
        updateRegion,
        toggleRegionActive,
        addMasterProduct,
        updateMasterProduct,
        assignMasterProductToVendor,
        updateVendorProductListing,
        removeVendorProductListing,
        addProduct: addMasterProduct, // Fallback alias hai ye 
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