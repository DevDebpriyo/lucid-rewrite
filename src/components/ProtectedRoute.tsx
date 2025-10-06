import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return null; // could render a spinner/skeleton

  if (!user) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?next=${redirectTo}`} replace />;
  }

  return <Outlet />;
}
