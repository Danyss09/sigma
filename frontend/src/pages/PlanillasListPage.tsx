import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarPlanillas, actualizarPlanilla, eliminarPlanilla, PlanillaListado } from '../api/planillasCrudApi';
import { useAuthStore } from '../store/authStore';
import { estadoMeta } from '../styles/riesgoMeta';

const CHIPS = [
  { key: 'todas', label: 'Todas' },
  { key: 'SUBIDA', label: 'Subida' },
  { key: 'PROCESANDO', label: 'Procesando' },
  { key: 'COMPLETADA', label: 'Completada' },
  { key: 'ERROR', label: 'Error' },
];

function PlanillasListPage(): JSX.Element {
  const [planillas, setPlanillas] = useState<PlanillaListado[]>([]);
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<PlanillaListado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const usuario = useAuthStore((state) => state.usuario);

  async function cargar(): Promise<void> {
    setCargando(true);
    try {
      const data = await listarPlanillas();
      setPlanillas(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtradas = planillas.filter((p) => {
    const pasaEstado = filtro === 'todas' || p.estado === filtro;
    const pasaBusqueda =
      !busqueda ||
      p.hospital.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(p.id).includes(busqueda);
    return pasaEstado && pasaBusqueda;
  });

  async function handleEliminar(p: PlanillaListado): Promise<void> {
    const confirmado = window.confirm(
      `¿Eliminar la planilla #${p.id} (${p.nombreArchivo})?\n\n` +
        `Si ya tiene trámites/detalles procesados, esos NO se borran automáticamente — quedan huérfanos. Úsalo solo para datos de prueba.`,
    );
    if (!confirmado) return;
    setError(null);
    try {
      await eliminarPlanilla(p.id);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? `No se pudo eliminar la planilla #${p.id}`);
    }
  }

  const iniciales = usuario?.nombre
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>Planillas</div>
          <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
            Gestión y auditoría de planillas médicas cargadas al sistema.
          </div>
        </div>
        <button
          className="btn-secondary"
          onClick={() => navigate('/subir')}
          style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}
        >
          + Nueva carga
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 28 }}>
        <TarjetaStat label="Total planillas" valor={planillas.length} />
        <TarjetaStat label="Subidas (sin procesar)" valor={planillas.filter((p) => p.estado === 'SUBIDA').length} />
        <TarjetaStat label="Completadas" valor={planillas.filter((p) => p.estado === 'COMPLETADA').length} colorVar="--risk-bajo" />
        <TarjetaStat
          label="Con firmas pendientes"
          valor={planillas.filter((p) => !p.revisadoNombre || !p.aprobadoNombre).length}
          colorVar="--risk-medio"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {CHIPS.map((c) => (
            <button
              key={c.key}
              className="chip"
              onClick={() => setFiltro(c.key)}
              style={{
                padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                background: filtro === c.key ? 'var(--brand)' : 'var(--surface)',
                color: filtro === c.key ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${filtro === c.key ? 'var(--brand)' : 'var(--border)'}`,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Buscar por hospital o ID"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: 280, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }}
        />
      </div>

      {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid', gridTemplateColumns: '0.5fr 1.3fr 0.7fr 0.7fr 0.8fr 0.9fr 2fr',
            padding: '12px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)',
            fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em',
          }}
        >
          <div>ID</div><div>Hospital</div><div>Período</div><div>Firmas</div><div>Estado</div><div>Subida</div><div>Acciones</div>
        </div>

        {cargando && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando...</div>}

        {!cargando &&
          filtradas.map((p) => {
            const em = estadoMeta(p.estado);
            return (
              <div
                key={p.id}
                className="row-hover"
                style={{
                  display: 'grid', gridTemplateColumns: '0.5fr 1.3fr 0.7fr 0.7fr 0.8fr 0.9fr 2fr',
                  padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center',
                }}
              >
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500 }}>#{p.id}</div>
                <div style={{ fontSize: 13.5 }}>{p.hospital}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.periodo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {p.revisadoNombre ? '✅' : '⬜'} Rev · {p.aprobadoNombre ? '✅' : '⬜'} Aprob
                </div>
                <div>
                  <span style={{ background: em.bg, color: em.color, padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600 }}>
                    {em.label}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {new Date(p.createdAt).toLocaleDateString('es-EC')}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => navigate(`/procesar?planillaId=${p.id}`)} className="btn-secondary" style={{ padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    Procesar
                  </button>
                  <button onClick={() => navigate(`/revisar-riesgo/${p.id}`)} className="btn-primary" style={{ padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    Riesgo →
                  </button>
                  <button onClick={() => navigate(`/auditoria?planillaId=${p.id}`)} className="btn-secondary" style={{ padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    Auditoría
                  </button>
                  <button onClick={() => setEditando(p)} className="btn-secondary" style={{ padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(p)}
                    style={{ padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--risk-critico-bg)', color: 'var(--risk-critico)', border: '1px solid var(--risk-critico-bg)', cursor: 'pointer' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}

        {!cargando && filtradas.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>No hay planillas que coincidan.</div>
        )}
      </div>

      {editando && (
        <ModalEditar
          planilla={editando}
          onClose={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function ModalEditar({
  planilla,
  onClose,
  onGuardado,
}: {
  planilla: PlanillaListado;
  onClose: () => void;
  onGuardado: () => void;
}): JSX.Element {
  const [hospital, setHospital] = useState(planilla.hospital);
  const [periodo, setPeriodo] = useState(planilla.periodo);
  const [revisadoNombre, setRevisadoNombre] = useState(planilla.revisadoNombre ?? '');
  const [aprobadoNombre, setAprobadoNombre] = useState(planilla.aprobadoNombre ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar(): Promise<void> {
    setError(null);
    setGuardando(true);
    try {
      await actualizarPlanilla(planilla.id, { hospital, periodo, revisadoNombre, aprobadoNombre });
      onGuardado();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 18 }}>Editar planilla #{planilla.id}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Hospital" value={hospital} onChange={setHospital} />
          <Campo label="Período" value={periodo} onChange={setPeriodo} />
          <Campo label="Nombre revisor" value={revisadoNombre} onChange={setRevisadoNombre} />
          <Campo label="Nombre aprobador" value={aprobadoNombre} onChange={setAprobadoNombre} />
        </div>

        {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13, marginTop: 10 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando} className="btn-primary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
    </div>
  );
}

function TarjetaStat({ label, valor, colorVar }: { label: string; valor: number; colorVar?: string }): JSX.Element {
  return (
    <div style={{ background: colorVar ? `var(${colorVar}-bg)` : 'var(--surface)', border: `1px solid ${colorVar ? `var(${colorVar}-bg)` : 'var(--border)'}`, borderRadius: 10, padding: 20 }}>
      <div style={{ fontSize: 12.5, color: colorVar ? `var(${colorVar})` : 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 26, fontWeight: 700, color: colorVar ? `var(${colorVar})` : 'var(--text)' }}>{valor}</div>
    </div>
  );
}

export default PlanillasListPage;
