import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { OrderProvider } from "./context/OrderContext";
import { AddressProvider } from "./context/AddressContext";
import { RegionProvider } from "./context/RegionContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AdminProvider } from "./context/AdminContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Home from "./pages/public/Home";
import CategoryListing from "./pages/public/CategoryListing";
import Categories from "./pages/public/Categories";
import ProductDetail from "./pages/public/ProductDetail";
import SearchResults from "./pages/public/SearchResults";
import Cart from "./pages/customer/Cart";
import Checkout from "./pages/customer/Checkout";
import Orders from "./pages/customer/Orders";
import OrderDetail from "./pages/customer/OrderDetail";
import Profile from "./pages/customer/Profile";
import Addresses from "./pages/customer/Addresses";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DrDashboard from "./pages/dr/DrDashboard";

import BottomNav from "./components/BottomNav";

const isVendorApp = import.meta.env.VITE_APP_MODE === "vendor";

function NativeBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let sub;
    CapApp.addListener("backButton", ({ canGoBack }) => {
      const exitRoutes = ["/", "/login", "/vendor/dashboard"];
      if (exitRoutes.includes(location.pathname)) {
        CapApp.exitApp();
      } else if (canGoBack) {
        navigate(-1);
      } else {
        CapApp.exitApp();
      }
    }).then((s) => {
      sub = s;
    });

    return () => {
      if (sub) sub.remove();
    };
  }, [location.pathname, navigate]);

  return null;
}

function VendorRoot() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full mb-3" />
        <p className="text-xs text-slate-400 font-bold">Loading BuildCity Partner...</p>
      </div>
    );
  }

  if (user?.role === "vendor") {
    return <Navigate to="/vendor/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

function CatchAll() {
  const { user, loading } = useAuth();
  if (loading) return null;
  const target =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "dr"
      ? "/dr/dashboard"
      : user?.role === "vendor"
      ? "/vendor/dashboard"
      : isVendorApp
      ? "/login"
      : "/";
  return <Navigate to={target} replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function StorefrontMobileNav() {
  const { pathname } = useLocation();
  const isDashboardOrAuth =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/dr") ||
    pathname === "/login" ||
    pathname === "/register";

  if (isDashboardOrAuth || isVendorApp) return null;

  return <BottomNav />;
}

import { AlertProvider } from "./context/AlertContext";
import ErrorBoundary from "./components/ErrorBoundary";

import FirstTimeLocationModal from "./components/FirstTimeLocationModal";

export default function App() {
  return (
    <ErrorBoundary>
      <AlertProvider>
        <AuthProvider>
          <RegionProvider>
            <CartProvider>
              <OrderProvider>
                <AddressProvider>
                  <NotificationProvider>
                    <AdminProvider>
                      <BrowserRouter>
                        <ScrollToTop />
                        <NativeBackButtonHandler />
                        {!isVendorApp && <FirstTimeLocationModal />}
                        <StorefrontMobileNav />
                        <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Public Storefront or Dedicated Vendor Root */}
                  <Route path="/" element={isVendorApp ? <VendorRoot /> : <Home />} />
                  <Route path="/category/:slug" element={<CategoryListing />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/cart" element={<Cart />} />

                  {/* Protected Customer Routes (Login Required) */}
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute role="customer">
                        <Checkout />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute role="customer">
                        <Orders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders/:id"
                    element={
                      <ProtectedRoute role="customer">
                        <OrderDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute role="customer">
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/addresses"
                    element={
                      <ProtectedRoute role="customer">
                        <Addresses />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/vendor/dashboard"
                    element={
                      <ProtectedRoute role="vendor">
                        <VendorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute role="admin">
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dr/dashboard"
                    element={
                      <ProtectedRoute role="dr">
                        <DrDashboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<CatchAll />} />
                </Routes>
              </BrowserRouter>
              </AdminProvider>
              </NotificationProvider>
              </AddressProvider>
            </OrderProvider>
          </CartProvider>
        </RegionProvider>
      </AuthProvider>
    </AlertProvider>
    </ErrorBoundary>
  );
}