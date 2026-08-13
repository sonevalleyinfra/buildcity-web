import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BottomNav from "../components/BottomNav";

// Wrap any route: <ProtectedRoute role="vendor"><VendorDashboard /></ProtectedRoute>
// role omitted = just needs to be logged in (any role)
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return null; // could render a spinner here

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    // logged in, but galat role pe  -> usko uske home par bhej doe access nahi 
    const home =
      user.role === "admin"
        ? "/admin/dashboard"
        : user.role === "dr"
        ? "/dr/dashboard"
        : user.role === "vendor"
        ? "/vendor/dashboard"
        : "/";
    return <Navigate to={home} replace />;
  }

  // mobile pe alag nav and destop pe alag .
  // ek bar ender karu and har jagah ho jae 
  // in destop ye upar dekhega header pe 
  if (role === "customer" || !role) {
    return (
      <>
        <BottomNav />
        {children}
      </>
    );
  }

  return children;
}