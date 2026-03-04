import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../../context/UserContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) {
    // You can replace this with a proper loading spinner
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their appropriate dashboard if they try to access unauthorized route
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return children;
};

export default ProtectedRoute;
