import { useState, useEffect } from 'react';
import BotonRegresar from '../components/BotonRegresar';
import { listarEventosAuditoria, EventoAuditoria, FiltrosAuditLog } from '../api/auditLogApi';

// Vista LOPDP: quién accedió a qué, cuándo. Solo ADMIN (protegido también
// en el backend con RolesGuard -- esta pantalla no es la única defensa).
function AuditoriaSistemaPage(): JSX.Element {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosAuditLog>({ page: 1, limit: 50 });

  async function cargar(): Promise<void> {
    setCargando(true);
    setError(null);
    try {
      const data = await listarEventosAuditoria(filtros);
      setEventos(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar el registro de auditoría');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  return (
    <div>
      <BotonRegresar to="/planillas" />

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Auditoría del sistema</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
          Registro de trazabilidad LOPDP: quién accedió a qué archivo, cuándo, y con qué resultado.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input
          type="number"
          placeholder="ID de planilla"
          onChange={(e) => setFiltros((f) => ({ ...f, page: 1, fileId: e.target.value ? Number(e.target.value) : undefined }))}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 140 }}
        />
        <input
          type="number"
          placeholder="ID de usuario"
          onChange={(e) => setFiltros((f) => ({ ...f, page: 1, userId: e.target.value ? Number(e.target.value) : undefined }))}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 140 }}
        />
        <input
          type="date"
          onChange={(e) => setFiltros((f) => ({ ...f, page: 1, from: e.target.value || undefined }))}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
        />
        <input
          type="date"
          onChange={(e) => setFiltros((f) => ({ ...f, page: 1, to: e.target.value || undefined }))}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
        />
      </div>

      {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 2fr', padding: '12px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <div>Fecha</div><div>Usuario</div><div>Acción</div><div>Planilla</div><div>Resultado</div>
        </div>

        {cargando && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando...</div>}

        {!cargando &&
          eventos.map((ev) => (
            <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 2fr', padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 12.5, alignItems: 'center' }}>
              <div style={{ color: 'var(--text-muted)' }}>{new Date(ev.createdAt).toLocaleString('es-EC')}</div>
              <div>{ev.user ? `${ev.user.nombre}` : '(sistema)'}</div>
              <div>
                <span style={{ background: 'var(--surface-alt)', padding: '3px 8px', borderRadius: 999, fontSize: 11 }}>{ev.action}</span>
              </div>
              <div>{ev.file ? `#${ev.file.id}` : '—'}</div>
              <div style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ev.resultado ?? ''}>
                {ev.resultado ?? '—'}
              </div>
            </div>
          ))}

        {!cargando && eventos.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>No hay eventos que coincidan con el filtro.</div>
        )}
      </div>

      {total > (filtros.limit ?? 50) && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <button
            disabled={(filtros.page ?? 1) <= 1}
            onClick={() => setFiltros((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            className="btn-secondary" style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12.5 }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', alignSelf: 'center' }}>
            Página {filtros.page ?? 1} de {Math.ceil(total / (filtros.limit ?? 50))}
          </span>
          <button
            onClick={() => setFiltros((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            className="btn-secondary" style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12.5 }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

export default AuditoriaSistemaPage;
