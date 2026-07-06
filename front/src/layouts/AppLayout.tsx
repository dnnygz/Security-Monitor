import { NavLink, Outlet } from 'react-router-dom';
import { Bot, Camera, FileText, Gauge, Layers3, LogOut, RadioTower, ShieldCheck } from 'lucide-react';
import { getRoleLabel, routeAccess, userHasRole } from '../auth/roles';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', icon: Gauge, roles: routeAccess.dashboard },
  { to: '/eventos', label: 'Sensores', icon: RadioTower, roles: routeAccess.eventos },
  { to: '/grabaciones', label: 'Grabaciones', icon: Camera, roles: routeAccess.grabaciones },
  { to: '/reportes', label: 'Reportes', icon: FileText, roles: routeAccess.reportes },
  { to: '/analisis-ia', label: 'Análisis IA', icon: Bot, roles: routeAccess.analisisIa },
  { to: '/catalogos', label: 'Catálogos', icon: Layers3, roles: routeAccess.catalogos },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ShieldCheck size={28} />
          <div>
            <strong>Security Monitor</strong>
            <span>Retail Risk Control</span>
          </div>
        </div>

        <nav className="nav-list">
          {links.filter((link) => userHasRole(user, link.roles)).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="user-chip">
            <span>{user?.nombre?.slice(0, 1).toUpperCase() || 'U'}</span>
            <div>
              <strong>{user?.nombre || 'Usuario'}</strong>
              <small>{getRoleLabel(user)}</small>
            </div>
          </div>
          <button className="ghost-button" onClick={logout}>
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
