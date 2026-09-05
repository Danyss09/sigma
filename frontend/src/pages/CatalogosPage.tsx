import { useState, useEffect } from 'react';
import BotonRegresar from '../components/BotonRegresar';
import { listarVersionesCatalogo, activarVersionCatalogo, desactivarVersionCatalogo, VersionCatalogo } from '../api/adminApi';

const ESTADO_COLOR: Record<string, { bg: string; color: string }> = {
  BORRADOR: { bg: 'var(--surface-alt)', color: 'var(--text-muted)' },
  ACTIVO: { bg: 'var(--risk-bajo-bg)', color: 'var(--risk-bajo)' },
  HISTORICO: { bg: 'var(--brand-light)', color: 'var(--brand-dark)' },
  RECHAZADO: { bg: 'var(--risk-critico-bg)', color: 'var(--risk-critico)' },
};

function CatalogosPage(): JSX.Element {
  const [versiones, setVersiones] = useState<VersionCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<number | null>(null);

  async function cargar(): Promise<void> {
    setCargando(true);
    try {
      const data = await listarVersionesCatalogo();
      setVersiones(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar la lista de catálogos');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleActivar(id: number): Promise<void> {
    setProcesando(id);
    try {
      await activarVersionCatalogo(id);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al activar');
    } finally {
      setProcesando(null);
    }
  }

  async function handleDesactivar(id: number): Promise<void> {
    setProcesando(id);
    try {
      await desactivarVersionCatalogo(id);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al desactivar');
    } finally {
      setProcesando(null);
    }
  }

  // Agrupa por tipo de catálogo para que se vea ordenado
  const porTipo = versiones.reduce<Record<string, VersionCatalogo[]>>((acc, v) => {
    (acc[v.tipo_catalogo] ??= []).push(v);
    return acc;
  }, {});

  return (
    <div>
      <BotonRegresar to="/planillas" />

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Configuración — Catálogos</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
          Tarifario, medicamentos/insumos, CPC/VAE, motivos de objeción, precios históricos, base histórica IA.
          Solo puede haber una versión <strong>ACTIVA</strong> por tipo a la vez.
        </div>
      </div>

      {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {cargando && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando...</div>}

      {!cargando &&
        Object.entries(porTipo).map(([tipo, lista]) => (
          <div key={tipo} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {tipo.replace(/_/g, ' ')}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {lista.map((v) => {
                const colores = ESTADO_COLOR[v.estado] ?? ESTADO_COLOR.BORRADOR;
                return (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.nombre} — v{v.version}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {v.total_registros ?? '—'} registros · cargado {new Date(v.fecha_carga).toLocaleDateString('es-EC')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ background: colores.bg, color: colores.color, padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600 }}>
                        {v.estado}
                      </span>
                      {v.estado !== 'ACTIVO' ? (
                        <button
                          onClick={() => handleActivar(v.id)}
                          disabled={procesando === v.id}
                          className="btn-primary"
                          style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}
                        >
                          {procesando === v.id ? '...' : 'Activar'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDesactivar(v.id)}
                          disabled={procesando === v.id}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}
                        >
                          {procesando === v.id ? '...' : 'Desactivar'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      <div style={{ padding: 16, background: 'var(--surface-alt)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>
        Para cargar una versión NUEVA de un catálogo, todavía se hace con los scripts de importación (Python + SQL) — esta pantalla permite ver y activar/desactivar las versiones ya cargadas. La importación desde el navegador queda para una fase futura.
      </div>
    </div>
  );
}

export default CatalogosPage;
