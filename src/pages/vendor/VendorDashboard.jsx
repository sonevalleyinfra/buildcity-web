import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VendorShell from "./VendorShell";
import OrdersTab from "./sections/OrdersTab";
import ProductsTab from "./sections/ProductsTab";
import OverviewTab from "./sections/OverviewTab";
import ProfileTab from "./sections/ProfileTab";
import CatalogSheet from "./sections/CatalogSheet";
import EditListingSheet from "./sections/EditListingSheet";
import NewOrderToast from "./sections/NewOrderToast";
import useVendorIdentity from "./hooks/useVendorIdentity";
import useVendorOrders from "./hooks/useVendorOrders";
import useOrderFilters from "./hooks/useOrderFilters";
import useVendorProducts from "./hooks/useVendorProducts";
import useCatalogOffer from "./hooks/useCatalogOffer";
import useListingEditor from "./hooks/useListingEditor";
import { listingImage, resolveProductImage } from "./utils/productImage";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import { useOrders } from "../../context/OrderContext";
import { useAlert } from "../../context/AlertContext";
import { requestOrderNotificationPermission } from "../../utils/orderAlertSound";
import { initVendorPushNotifications } from "../../utils/pushNotifications";

// Vendor partner portal. This file only wires data to screens:
// order feed / filters / products / sheets live in ./hooks, screens in ./sections.
export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();
  const {
    masterProducts = [],
    vendors = [],
    products = [],
    productsLoading,
    categories = [],
    assignMasterProductToVendor,
    updateVendorProductListing,
  } = useAdmin();
  const { orders = [], fetchVendorOrders, fetchVendorOrdersPage, updateOrderStatus, ordersSummary } = useOrders();

  const { vendor, shopName, ownerName, vendorPhone, districtName, vendorId, isItemForThisVendor } = useVendorIdentity(user, vendors);

  // Tabs, with history for the Android back button
  const [activeTab, setActiveTabState] = useState("orders");
  const [tabHistory, setTabHistory] = useState(["orders"]);
  const setActiveTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTabState(tab);
    setTabHistory((prev) => [...prev, tab]);
  };

  const feed = useVendorOrders({
    vendorId,
    shopName,
    isItemForThisVendor,
    contextOrders: orders,
    fetchVendorOrders,
    fetchVendorOrdersPage,
    updateOrderStatus,
    ordersSummary,
    showAlert,
    // Notification tap / "View order": show the orders tab with nothing filtered out
    onHighlight: () => {
      setActiveTabState("orders");
      orderFilters.clearFilters();
    },
  });
  const orderFilters = useOrderFilters(feed.vendorOrders, feed.statusTransition);
  const catalog = useCatalogOffer({
    masterProducts,
    showAlert,
    submitListing: ({ masterProduct, price, mrp, stockQty }) =>
      assignMasterProductToVendor({
        masterProductId: masterProduct.id,
        vendorId,
        vendorName: shopName,
        regionId: vendor.regionId || user?.vendorInfo?.regionId,
        regionName: districtName || vendor.regionName || "Mirzapur",
        districtName: districtName || vendor.regionName || "Mirzapur",
        price,
        mrp,
        stockQty,
        addedBy: `Vendor (${shopName})`,
      }),
  });
  const editor = useListingEditor({ updateVendorProductListing, showAlert });
  const productView = useVendorProducts({ products, categories, vendorId, vendor, user, shopName, ownerName });
  const { vendorProducts } = productView;
  const { stats } = feed;

  const handleLogout = () => {
    logout();
    navigate("/vendor/login", { replace: true });
  };

  // Notification permission + FCM background push
  useEffect(() => {
    requestOrderNotificationPermission().catch(() => {});
    if (vendorId) {
      initVendorPushNotifications(vendorId, { phone: user?.phone || vendor.phone || "" }).catch(() => {});
    }
  }, [vendorId, user?.id, user?.phone, vendor.phone]);

  // Android back: close a sheet → previous tab → let the app exit on the first tab (re-bound every render)
  useEffect(() => {
    window.__buildcity_vendor_back_handler = () => {
      if (catalog.open) {
        catalog.close();
        return true;
      }
      if (editor.editingProduct) {
        editor.close();
        return true;
      }
      if (tabHistory.length > 1) {
        const updated = tabHistory.slice(0, -1);
        setTabHistory(updated);
        setActiveTabState(updated[updated.length - 1]);
        return true;
      }
      return false;
    };
    return () => {
      window.__buildcity_vendor_back_handler = null;
    };
  });

  // Lock background scroll while a sheet is open
  useEffect(() => {
    if (!catalog.open && !editor.editingProduct) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [catalog.open, editor.editingProduct]);

  // Cancelling is the one status change that needs a second tap
  const requestStatusChange = (orderId, newStatus) => {
    if ((newStatus || "").toUpperCase() !== "CANCELLED") return feed.changeStatus(orderId, newStatus);
    showConfirm({
      title: "Cancel this order?",
      message: "It will move to Completed as cancelled.",
      type: "warning",
      confirmText: "Cancel order",
      cancelText: "Keep order",
      onConfirm: () => feed.changeStatus(orderId, newStatus),
    });
  };

  const imageFor = (p) => ({ src: listingImage(p, masterProducts), fallback: resolveProductImage(null, p.categoryName, p.name) });

  const openOrders = (statusFilter = "ALL") => {
    orderFilters.showSection("ACTIVE", statusFilter);
    setActiveTab("orders");
  };

  // Jump from an overview row to that order's card
  const openOrder = (ord) => {
    const st = (ord.status || "PENDING").toUpperCase();
    orderFilters.showSection(st === "DELIVERED" || st === "CANCELLED" ? "COMPLETED" : "ACTIVE");
    setActiveTab("orders");
    feed.triggerOrderHighlight(ord.id || ord.orderNumber);
  };

  return (
    <VendorShell
      shopName={shopName}
      ownerName={ownerName}
      districtName={districtName}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      activeOrdersCount={stats.activeCount}
      onAddProduct={catalog.openSheet}
      overlays={
        <>
          <NewOrderToast
            order={feed.newOrderAlert}
            onDismiss={feed.dismissNewOrderAlert}
            onView={() => {
              feed.triggerOrderHighlight(feed.newOrderAlert.id || feed.newOrderAlert.orderNumber);
              feed.dismissNewOrderAlert();
            }}
          />

          <CatalogSheet
            open={catalog.open}
            onClose={catalog.close}
            totalCount={masterProducts.length}
            products={catalog.filteredProducts}
            categories={categories}
            categoryFilter={catalog.categoryFilter}
            onCategoryFilterChange={catalog.setCategoryFilter}
            search={catalog.search}
            onSearchChange={catalog.setSearch}
            isInStore={(mp) => vendorProducts.some((vp) => vp.masterProductId === mp.id || vp.name === mp.name)}
            selectedId={catalog.selectedId}
            onToggleSelect={catalog.toggleSelect}
            imageFor={imageFor}
            form={catalog.form}
            onSubmit={catalog.submit}
            isSubmitting={catalog.isSubmitting}
          />

          {editor.editingProduct && (
            <EditListingSheet
              product={editor.editingProduct}
              image={imageFor(editor.editingProduct)}
              onClose={editor.close}
              onSubmit={editor.save}
              onMrpChange={editor.onMrpChange}
              onDiscountChange={editor.onDiscountChange}
              onPriceChange={editor.onPriceChange}
              onStockChange={editor.onStockChange}
              isSaving={false}
            />
          )}
        </>
      }
    >
      {activeTab === "orders" && (
        <OrdersTab
          districtName={districtName}
          vendorOrders={feed.vendorOrders}
          activeOrders={orderFilters.activeOrders}
          completedOrders={orderFilters.completedOrders}
          filteredOrders={orderFilters.filteredOrders}
          completedOrdersCount={stats.completedCount}
          vendorOrdersCount={stats.totalCount}
          sectionTab={orderFilters.sectionTab}
          onSectionTabChange={orderFilters.setSectionTab}
          statusFilter={orderFilters.statusFilter}
          onStatusFilterChange={orderFilters.setStatusFilter}
          search={orderFilters.search}
          onSearchChange={orderFilters.setSearch}
          highlightedOrderId={feed.highlightedOrderId}
          statusTransition={feed.statusTransition}
          updatingOrderId={feed.updatingOrderId}
          getCustomerStats={orderFilters.getCustomerStats}
          onStatusChange={requestStatusChange}
          pagination={{ hasMore: feed.hasMore, loading: feed.loadingMore, onLoadMore: feed.loadMore }}
        />
      )}

      {activeTab === "products" && (
        <ProductsTab
          products={vendorProducts}
          displayedProducts={productView.displayedProducts}
          loading={productsLoading}
          categories={productView.allCategories}
          categoryFilter={productView.categoryFilter}
          onCategoryFilterChange={productView.setCategoryFilter}
          search={productView.search}
          onSearchChange={productView.setSearch}
          imageFor={imageFor}
          onEdit={editor.open}
          onAddProduct={catalog.openSheet}
        />
      )}

      {activeTab === "overview" && (
        <OverviewTab
          shopName={shopName}
          ownerName={ownerName}
          districtName={districtName}
          totalRevenue={stats.totalRevenue}
          activeOrdersCount={stats.activeCount}
          pendingOrdersCount={stats.pendingCount}
          completedOrdersCount={stats.completedCount}
          vendorOrders={feed.vendorOrders}
          vendorProducts={vendorProducts}
          productsLoading={productsLoading}
          imageFor={imageFor}
          onOpenOrders={() => openOrders()}
          onOpenPending={() => openOrders("PENDING")}
          onOpenOrder={openOrder}
          onOpenProducts={() => setActiveTab("products")}
          onEditProduct={editor.open}
          onAddProduct={catalog.openSheet}
        />
      )}

      {activeTab === "profile" && (
        <ProfileTab
          ownerName={ownerName}
          shopName={shopName}
          vendorPhone={vendorPhone}
          email={user?.email}
          districtName={districtName}
          onLogout={handleLogout}
        />
      )}
    </VendorShell>
  );
}
