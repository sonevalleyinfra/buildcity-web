import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BottomNav from "../components/BottomNav";

// Wrap any route: <ProtectedRoute role="vendor"><VendorDashboard /></ProtectedRoute>
// role omitted = just needs to be logged in (any role)
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // could render a spinner here

  if (!user) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectParam}`} replace />;
  }

  const userRole = (user?.role || "").toLowerCase();
  const targetRole = (role || "").toLowerCase();

  if (role) {
    const isVendorMatch = targetRole === "vendor" && (userRole === "vendor" || !!user.vendorInfo || !!user.vendorId);
    if (!isVendorMatch && userRole !== targetRole) {
      // logged in, but galat role pe -> redirect to rightful dashboard
      const home =
        userRole === "admin"
          ? "/admin/dashboard"
          : userRole === "dr"
          ? "/dr/dashboard"
          : (userRole === "vendor" || user.vendorInfo || user.vendorId)
          ? "/vendor/dashboard"
          : "/";
      return <Navigate to={home} replace />;
    }
  }

  return children;
}