import { createContext, useContext, useEffect, useState } from "react";

const AdminContext = createContext(null);

const seedDrs = [];
const seedVendors = [];

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

const seedMasterProducts = [];
const seedProducts = [];

export function AdminProvider({ children }) {
  const [drs, setDrs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState(seedCategories);
  const [regions, setRegions] = useState(seedRegions);
  const [masterProducts, setMasterProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Single Source of Truth: Supabase Cloud DB se live data sync karne ke liye (Zero flickering guard ke sath)
  const fetchCloudData = async () => {
    try {
      const syncRes = await fetch("http://localhost:5000/api/v1/cloud-sync").then((r) => r.json()).catch(() => null);
      if (!syncRes) return;

      const { drs: drsRes, vendors: vendorsRes, masterProducts: masterRes, categories: categoriesRes, regions: regionsRes, orders: ordersRes, listings: listingsRes } = syncRes;

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
        // JSON Memory Reference Guard: Data same hone par re-render skip karein (Flickering protection)
        setDrs((prev) => (JSON.stringify(prev) === JSON.stringify(formattedDrs) ? prev : formattedDrs));
      }

      if (vendorsRes && Array.isArray(vendorsRes)) {
        const formattedVendors = vendorsRes.map((v) => ({
          id: v.id,
          shopName: v.shopName,
          ownerName: v.ownerName,
          phone: v.phone,
          regionId: v.regionId,
          regionName: v.region?.name || "Varanasi",
          status: v.status || "APPROVED",
          commissionRate: Number(v.commissionRate) || 10,
          productCount: Array.isArray(v.vendorProducts) ? v.vendorProducts.length : (v.user?.productCount || 0),
          joinedOn: v.joinedOn ? v.joinedOn.split("T")[0] : "2026-03-12",
          addedByDr: v.addedByDr || "Ramesh Sharma",
        }));
        // JSON Memory Reference Guard: Vendors array change na hone par re-render skip karein
        setVendors((prev) => (JSON.stringify(prev) === JSON.stringify(formattedVendors) ? prev : formattedVendors));
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
          gstRate: Number(c.gstRate) || 18,
          productCount: c.productCount || 100,
          isActive: c.isActive !== false,
        }));
        setCategories((prev) => (JSON.stringify(prev) === JSON.stringify(formattedCats) ? prev : formattedCats));
      }

      if (regionsRes && Array.isArray(regionsRes)) {
        const formattedRegs = regionsRes.map((r) => ({
          id: r.id,
          name: r.name,
          state: r.state || "Uttar Pradesh",
          baseDeliveryCharge: Number(r.baseDeliveryCharge) || 49,
          isActive: r.isActive !== false,
        }));
        setRegions((prev) => (JSON.stringify(prev) === JSON.stringify(formattedRegs) ? prev : formattedRegs));
      }

      if (ordersRes && Array.isArray(ordersRes)) {
        setOrders((prev) => (JSON.stringify(prev) === JSON.stringify(ordersRes) ? prev : ordersRes));
      }

      if (listingsRes && Array.isArray(listingsRes)) {
        const formattedListings = listingsRes.map((l) => ({
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
          vendorName: l.vendor?.shopName || l.vendorName || "Shree Cement Traders",
          price: Number(l.price) || 100,
          stockQty: Number(l.stockQty) || 100,
          imageUrl: l.imageUrl || l.masterProduct?.imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
          approvalStatus: l.approvalStatus || (l.isActive ? "APPROVED" : "PENDING_REVIEW"),
          isActive: l.isActive !== undefined ? l.isActive : l.approvalStatus === "APPROVED",
          addedBy: l.addedBy || "Vendor",
        }));
        setProducts((prev) => (JSON.stringify(prev) === JSON.stringify(formattedListings) ? prev : formattedListings));
      }
    } catch (err) {
      console.warn("Cloud sync note:", err.message);
    } finally {
      setProductsLoading(false);
    }
  };

  // Continuous Live Auto Polling (2s) & Tab Storage Sync from Supabase Cloud DB
  useEffect(() => {
    fetchCloudData();
    const interval = setInterval(fetchCloudData, 2000);

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
      const res = await fetch("http://localhost:5000/api/v1/drs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: drData.name, phone: drData.phone.trim(), regionId: drData.regionId }),
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

  const toggleDrActive = (id) => {
    setDrs((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : d
      )
    );
  };

  const addVendor = async (vendorData) => {
    const regionObj = regions.find((r) => r.id === vendorData.regionId) || {};
    try {
      const res = await fetch("http://localhost:5000/api/v1/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: vendorData.shopName,
          ownerName: vendorData.ownerName,
          phone: vendorData.phone,
          regionId: vendorData.regionId,
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

  const setVendorStatus = async (id, status) => {
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status } : v))
    );
    try {
      await fetch(`http://localhost:5000/api/v1/vendors/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchCloudData();
    } catch {}
  };

  const removeVendor = async (id) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
    try {
      const res = await fetch(`http://localhost:5000/api/v1/vendors/${id}`, {
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

  const addCategory = (categoryData) => {
    const newCat = {
      id: "c-" + Date.now(),
      name: categoryData.name,
      gstRate: Number(categoryData.gstRate) || 18,
      productCount: 0,
      isActive: true,
    };
    setCategories((prev) => [newCat, ...prev]);
    return newCat;
  };

  const addRegion = (regionData) => {
    const newReg = {
      id: "r-" + Date.now(),
      name: regionData.name,
      state: regionData.state || "Uttar Pradesh",
      baseDeliveryCharge: Number(regionData.baseDeliveryCharge) || 49,
      isActive: true,
    };
    setRegions((prev) => [newReg, ...prev]);
    return newReg;
  };

  const addMasterProduct = async (mpData) => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/master-products", {
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

  const assignMasterProductToVendor = async ({ masterProductId, vendorId, vendorName, price, stockQty, addedBy }) => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/vendor/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterProductId, vendorId, price, stockQty, addedBy }),
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
      vendorId: vendorId || "v1",
      vendorName: vendorName || "Vendor Store",
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

  const updateVendorProductListing = (id, updates) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const removeVendorProductListing = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateListingApprovalStatus = async (id, approvalStatus) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, approvalStatus, isActive: approvalStatus === "APPROVED" } : p))
    );

    try {
      await fetch(`http://localhost:5000/api/v1/vendor/listings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus }),
      });
      await fetchCloudData();
    } catch {}
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
        productsLoading,
        stats,
        addDr,
        toggleDrActive,
        addVendor,
        setVendorStatus,
        removeVendor,
        addCategory,
        addRegion,
        addMasterProduct,
        assignMasterProductToVendor,
        updateVendorProductListing,
        removeVendorProductListing,
        updateListingApprovalStatus,
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