import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
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
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCatalogs()
      .then(setCatalogs)
      .finally(() => setLoading(false));
  }, []);

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
