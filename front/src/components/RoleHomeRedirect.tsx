import { Navigate } from 'react-router-dom';
import { EmptyState } from './EmptyState';
import { routeAccess, userHasRole } from '../auth/roles';
import { useAuth } from '../context/AuthContext';

const roleHomeRoutes = [
  { to: '/', roles: routeAccess.dashboard },
  { to: '/eventos', roles: routeAccess.eventos },
  { to: '/grabaciones', roles: routeAccess.grabaciones },
  { to: '/reportes', roles: routeAccess.reportes },
  { to: '/analisis-ia', roles: routeAccess.analisisIa },
  { to: '/catalogos', roles: routeAccess.catalogos },
];

export function RoleHomeRedirect() {
  const { user } = useAuth();
  const firstAllowedRoute = roleHomeRoutes.find((route) => userHasRole(user, route.roles));

  if (!firstAllowedRoute) {
    return (
      <EmptyState
        title="Sin módulos visibles"
        message="Tu rol está reservado para servicios backend y no tiene pantallas asignadas."
      />
    );
  }

  return <Navigate to={firstAllowedRoute?.to || '/login'} replace />;
}
