import React from "react";
import { Navigate } from "react-router-dom";

// ✅ PROTECTED ROUTE
// Props:
//   children    — the component to render if authorized
//   allowedRoles — optional array of roles, e.g. ["SUPER_ADMIN", "BB_ADMIN"]
//                  if not passed, any logged-in user is allowed

function ProtectedRoute({ children, allowedRoles }) {

  // ✅ CHECK LOGIN STATUS (support both old 'isLogin' and new 'blIsLoggedIn')
  const isLoggedIn =
    localStorage.getItem("blIsLoggedIn") === "true" ||
    localStorage.getItem("isLogin") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // ✅ GET CURRENT USER
  const currentUser =
    JSON.parse(localStorage.getItem("blCurrentUser")) ||
    JSON.parse(localStorage.getItem("user"));

  // ✅ ROLE CHECK (only if allowedRoles prop is provided)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = currentUser?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      // ✅ Not authorized for this role — redirect to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;