import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { OrderProvider } from "./context/OrderContext";
import { AddressProvider } from "./context/AddressContext";
import { RegionProvider } from "./context/RegionContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AdminProvider } from "./context/AdminContext";
import ProtectedRoute from "./routes/ProtectedRoute";

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

import { AlertProvider } from "./context/AlertContext";

export default function App() {
  return (
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
                      <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Public Storefront Routes (Flipkart Style Open Browsing) */}
                  <Route path="/" element={<Home />} />
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
  );
}