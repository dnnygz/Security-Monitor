import { Navigate, useLocation } from 'react-router-dom';
import type { RoleCode } from '../auth/roles';
import { userHasRole } from '../auth/roles';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: RoleCode[];
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !userHasRole(user, allowedRoles)) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}
