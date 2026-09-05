import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarCorreccionesGlobales, CorreccionGlobal } from '../api/correccionesGlobalesApi';
import BotonRegresar from '../components/BotonRegresar';
function CorreccionesPage(): JSX.Element {
  const [items, setItems] = useState<CorreccionGlobal[]>([]);
  const [query, setQuery] = useState('');
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCargando(true);
      listarCorreccionesGlobales(query || undefined)
        .then(setItems)
        .finally(() => setCargando(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const totalMonto = items.reduce((s, c) => s + (Number(c.valorAnterior) - Number(c.valorCorregido)), 0);
  const planillasAfectadas = new Set(items.map((c) => c.detalleServicio.expediente.tramite.planilla.id)).size;

  return (
    <div>
      <BotonRegresar to="/planillas" />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Correcciones automáticas</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
          Registro de auditoría de todas las correcciones aplicadas por el sistema.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16, marginBottom: 24 }}>
        <Stat label="Correcciones totales" valor={items.length} />
        <Stat label="Monto corregido" valor={`$${totalMonto.toFixed(2)}`} mono />
        <Stat label="Planillas afectadas" valor={planillasAfectadas} />
      </div>

      <div style={{ marginBottom: 16, width: 340 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por código, planilla o descripción"
          style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }}
        />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 0.7fr 0.6fr 1.6fr 0.9fr 0.9fr 0.9fr 0.7fr 0.3fr', padding: '12px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <div>Fecha</div><div>Planilla</div><div>Código</div><div>Descripción</div><div>Anterior</div><div>Corregido</div><div>Diferencia</div><div>Score</div><div />
        </div>

        {cargando && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando...</div>}

        {!cargando &&
          items.map((c) => {
            const expandido = expandidoId === c.id;
            const diff = Number(c.valorCorregido) - Number(c.valorAnterior);
            const planillaId = c.detalleServicio.expediente.tramite.planilla.id;
            return (
              <div key={c.id}>
                <div
                  className="row-toggle"
                  onClick={() => setExpandidoId(expandido ? null : c.id)}
                  style={{ display: 'grid', gridTemplateColumns: '0.8fr 0.7fr 0.6fr 1.6fr 0.9fr 0.9fr 0.9fr 0.7fr 0.3fr', padding: '13px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}
                >
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('es-EC')}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>#{planillaId}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{c.detalleServicio.codigoOriginal}</div>
                  <div style={{ fontSize: 13.5 }}>{c.detalleServicio.descripcion}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, textDecoration: 'line-through', color: 'var(--text-faint)' }}>
                    ${Number(c.valorAnterior).toFixed(2)}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>${Number(c.valorCorregido).toFixed(2)}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--risk-critico)' }}>
                    {diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(2)}
                  </div>
                  <div>
                    <span style={{ background: 'var(--risk-critico-bg)', color: 'var(--risk-critico)', padding: '4px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600 }}>
                      {Number(c.puntaje).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--text-faint)' }}>{expandido ? '▲' : '▼'}</div>
                </div>

                {expandido && (
                  <div style={{ padding: '16px 24px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Motivo de la corrección
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 760 }}>{c.motivo}</div>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); navigate(`/revisar-riesgo/${planillaId}`); }}
                      style={{ display: 'inline-block', marginTop: 12, fontSize: 12.5, fontWeight: 600 }}
                    >
                      Ver planilla #{planillaId} →
                    </a>
                  </div>
                )}
              </div>
            );
          })}

        {!cargando && items.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>
            No se encontraron correcciones{query ? ` para "${query}"` : ''}.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, valor, mono }: { label: string; valor: number | string; mono?: boolean }): JSX.Element {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, fontFamily: mono ? 'var(--mono)' : 'inherit' }}>{valor}</div>
    </div>
  );
}

export default CorreccionesPage;
