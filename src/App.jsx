import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
      : user
      ? "/"
      : "/login";
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <RegionProvider>
        <CartProvider>
          <OrderProvider>
            <AddressProvider>
              <NotificationProvider>
                <AdminProvider>
                <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  <Route
                    path="/"
                    element={
                      <ProtectedRoute role="customer">
                        <Home />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/category/:slug"
                    element={
                      <ProtectedRoute role="customer">
                        <CategoryListing />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/categories"
                    element={
                      <ProtectedRoute role="customer">
                        <Categories />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/product/:id"
                    element={
                      <ProtectedRoute role="customer">
                        <ProductDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/search"
                    element={
                      <ProtectedRoute role="customer">
                        <SearchResults />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cart"
                    element={
                      <ProtectedRoute role="customer">
                        <Cart />
                      </ProtectedRoute>
                    }
                  />
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
  );
}