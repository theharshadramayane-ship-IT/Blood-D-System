import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("blCurrentUser"));

  return user ? children : <Navigate to="/login" replace />;
}