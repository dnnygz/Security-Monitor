import { FormEvent, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { canCreateGlobalUsers, userHasRole } from '../auth/roles';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../services/api';
import { createGlobalUser, getRoles, getStores } from '../services/adminService';
import { getCatalogs } from '../services/catalogService';
import type { CatalogItem } from '../types';

type Catalog = {
  key: string;
  label: string;
  path: string;
  rows: CatalogItem[];
  unavailable?: boolean;
};

export function CatalogsPage() {
  const { user } = useAuth();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [roles, setRoles] = useState<CatalogItem[]>([]);
  const [stores, setStores] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    contrasena: '',
    id_rol: '3',
    id_tienda: '',
  });
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canCreateUsers = userHasRole(user, canCreateGlobalUsers);

  useEffect(() => {
    Promise.all([
      getCatalogs(),
      canCreateUsers ? getRoles() : Promise.resolve([]),
      canCreateUsers ? getStores() : Promise.resolve([]),
    ])
      .then(([nextCatalogs, nextRoles, nextStores]) => {
        setCatalogs(nextCatalogs);
        setRoles(nextRoles);
        setStores(nextStores);
      })
      .finally(() => setLoading(false));
  }, [canCreateUsers]);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFeedback('');
    setSaving(true);

    try {
      await createGlobalUser({
        nombre: form.nombre,
        correo: form.correo,
        contrasena: form.contrasena,
        id_rol: form.id_rol,
        id_tienda: form.id_tienda || user?.id_tienda || null,
      });
      setFeedback('Usuario creado correctamente.');
      setForm({ nombre: '', correo: '', contrasena: '', id_rol: '3', id_tienda: '' });
      setCatalogs(await getCatalogs());
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Administración</span>
          <h1>Usuarios y catálogos</h1>
          <p>Listados básicos para sensores, cámaras, zonas y tiendas.</p>
        </div>
      </header>

      {loading && <EmptyState title="Cargando catálogos" message="Consultando endpoints de catálogo." />}

      {canCreateUsers && (
        <GlassCard>
          <div className="card-heading">
            <div>
              <span className="eyebrow">ADMIN_GLOBAL</span>
              <h2>Crear usuario</h2>
            </div>
            <StatusBadge tone="info">Acceso total</StatusBadge>
          </div>

          <form className="admin-user-form" onSubmit={handleCreateUser}>
            <label>
              Nombre
              <input
                value={form.nombre}
                onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                required
              />
            </label>
            <label>
              Correo
              <input
                type="email"
                value={form.correo}
                onChange={(event) => setForm((current) => ({ ...current, correo: event.target.value }))}
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={form.contrasena}
                onChange={(event) => setForm((current) => ({ ...current, contrasena: event.target.value }))}
                required
                minLength={6}
              />
            </label>
            <label>
              Rol
              <select
                value={form.id_rol}
                onChange={(event) => setForm((current) => ({ ...current, id_rol: event.target.value }))}
                required
              >
                {roles.map((role) => (
                  <option key={String(role.id)} value={String(role.id)}>
                    {role.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tienda
              <select
                value={form.id_tienda}
                onChange={(event) => setForm((current) => ({ ...current, id_tienda: event.target.value }))}
              >
                <option value="">Mi tienda asignada</option>
                {stores.map((store) => (
                  <option key={String(store.id)} value={String(store.id)}>
                    {store.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={saving}>
              <UserPlus size={18} />
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </form>

          {feedback && <p className="form-success">{feedback}</p>}
          {error && <p className="form-error">{error}</p>}
        </GlassCard>
      )}

      <section className="catalog-grid">
        {catalogs.map((catalog) => (
          <GlassCard key={catalog.key}>
            <div className="card-heading">
              <div>
                <span className="eyebrow">{catalog.path}</span>
                <h2>{catalog.label}</h2>
              </div>
              <StatusBadge tone={catalog.unavailable ? 'warning' : 'success'}>
                {catalog.unavailable ? 'No disponible' : `${catalog.rows.length} registros`}
              </StatusBadge>
            </div>

            {catalog.rows.length === 0 ? (
              <EmptyState title="Sin datos" message="Este catálogo aún no devolvió registros." />
            ) : (
              <div className="compact-list">
                {catalog.rows.slice(0, 6).map((row, index) => (
                  <article key={String(row.id || index)}>
                    <strong>{row.nombre || row.modelo || `Registro ${row.id || index + 1}`}</strong>
                    <span>{row.descripcion || row.estado || 'Activo'}</span>
                  </article>
                ))}
              </div>
            )}
          </GlassCard>
        ))}
      </section>
    </div>
  );
}
