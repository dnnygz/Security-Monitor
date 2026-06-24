import { NavLink, Outlet } from 'react-router-dom';
import { Activity, Bot, Camera, FileText, Gauge, Layers3, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', icon: Gauge },
  { to: '/eventos', label: 'Eventos', icon: Activity },
  { to: '/grabaciones', label: 'Grabaciones', icon: Camera },
  { to: '/reportes', label: 'Reportes', icon: FileText },
  { to: '/analisis-ia', label: 'Análisis IA', icon: Bot },
  { to: '/catalogos', label: 'Catálogos', icon: Layers3 },
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
          {links.map(({ to, label, icon: Icon }) => (
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
              <small>Sesión activa</small>
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
