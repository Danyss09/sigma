import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BotonRegresar from '../components/BotonRegresar';
import {
  listarResponsables,
  crearResponsable,
  actualizarResponsable,
  eliminarResponsable,
  ResponsableFirma,
} from '../api/responsablesApi';

const TABS = [
  { key: 'catalogos', label: 'Catálogos y Tarifarios', path: '/configuracion/catalogos-detalle' },
  { key: 'firmas', label: 'Firmas y Responsables', path: '/configuracion/firmas' },
];

function ConfiguracionPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const tabActiva = location.pathname.includes('/firmas') ? 'firmas' : 'catalogos';

  return (
    <div>
      <BotonRegresar to="/planillas" />

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Configuración</div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(t.path)}
            style={{
              padding: '10px 16px', fontSize: 13.5, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
              color: tabActiva === t.key ? 'var(--brand)' : 'var(--text-muted)',
              borderBottom: tabActiva === t.key ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabActiva === 'firmas' && <SeccionFirmas />}
      {tabActiva === 'catalogos' && (
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
          Redirígete a <a href="#" onClick={(e) => { e.preventDefault(); navigate('/configuracion/catalogos-detalle'); }}>Catálogos y Tarifarios</a>.
        </p>
      )}
    </div>
  );
}

function SeccionFirmas(): JSX.Element {
  const [responsables, setResponsables] = useState<ResponsableFirma[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<ResponsableFirma | null>(null);
  const [mostrarAgregarRevisor, setMostrarAgregarRevisor] = useState(false);

  async function cargar(): Promise<void> {
    setCargando(true);
    try {
      const data = await listarResponsables();
      setResponsables(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar la configuración de firmas');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const director = responsables.find((r) => r.tipo === 'DIRECTOR_ADMINISTRATIVO');
  const revisores = responsables.filter((r) => r.tipo === 'REVISOR').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  async function handleToggleActivo(r: ResponsableFirma): Promise<void> {
    try {
      await actualizarResponsable(r.id, { activo: !r.activo });
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al actualizar');
    }
  }

  async function handleEliminar(r: ResponsableFirma): Promise<void> {
    if (!window.confirm(`¿Eliminar a ${r.nombreCompleto}?`)) return;
    try {
      await eliminarResponsable(r.id);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo eliminar (probablemente ya fue usado en documentos)');
    }
  }

  if (cargando) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando...</div>;

  return (
    <div>
      {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
          Director Administrativo
        </div>
        {director ? (
          <TarjetaResponsable responsable={director} onEditar={() => setEditando(director)} onToggle={() => handleToggleActivo(director)} />
        ) : (
          <div style={{ padding: 20, background: 'var(--surface-alt)', borderRadius: 10, fontSize: 13.5, color: 'var(--text-muted)' }}>
            No hay Director Administrativo configurado.
            <button
              onClick={() => setEditando({ id: 0, tipo: 'DIRECTOR_ADMINISTRATIVO', nombreCompleto: '', identificacion: null, cargo: '', firmaPath: null, orden: null, activo: true, nuncaUsado: true })}
              className="btn-primary"
              style={{ marginLeft: 12, padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
            >
              + Configurar
            </button>
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
            Revisores
          </div>
          <button onClick={() => setMostrarAgregarRevisor(true)} className="btn-secondary" style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            + Agregar revisor
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {revisores.map((r) => (
            <TarjetaResponsable
              key={r.id}
              responsable={r}
              onEditar={() => setEditando(r)}
              onToggle={() => handleToggleActivo(r)}
              onEliminar={r.nuncaUsado ? () => handleEliminar(r) : undefined}
            />
          ))}
          {revisores.length === 0 && (
            <div style={{ padding: 20, background: 'var(--surface-alt)', borderRadius: 10, fontSize: 13.5, color: 'var(--text-muted)' }}>
              No hay revisores configurados.
            </div>
          )}
        </div>
      </div>

      {editando && (
        <ModalEditarResponsable
          responsable={editando}
          onClose={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar(); }}
        />
      )}
      {mostrarAgregarRevisor && (
        <ModalEditarResponsable
          responsable={{ id: 0, tipo: 'REVISOR', nombreCompleto: '', identificacion: null, cargo: '', firmaPath: null, orden: null, activo: true, nuncaUsado: true }}
          onClose={() => setMostrarAgregarRevisor(false)}
          onGuardado={() => { setMostrarAgregarRevisor(false); cargar(); }}
        />
      )}
    </div>
  );
}

function TarjetaResponsable({
  responsable,
  onEditar,
  onToggle,
  onEliminar,
}: {
  responsable: ResponsableFirma;
  onEditar: () => void;
  onToggle: () => void;
  onEliminar?: () => void;
}): JSX.Element {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{responsable.nombreCompleto || '(sin nombre)'}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {responsable.cargo || '(sin cargo)'} {responsable.identificacion ? `· CI ${responsable.identificacion}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
          background: responsable.activo ? 'var(--risk-bajo-bg)' : 'var(--risk-critico-bg)',
          color: responsable.activo ? 'var(--risk-bajo)' : 'var(--risk-critico)',
        }}>
          {responsable.activo ? 'Activo' : 'Inactivo'}
        </span>
        <button onClick={onEditar} className="btn-secondary" style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>Editar</button>
        <button onClick={onToggle} className="btn-secondary" style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>
          {responsable.activo ? 'Desactivar' : 'Activar'}
        </button>
        {onEliminar && (
          <button onClick={onEliminar} style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: 'var(--risk-critico-bg)', color: 'var(--risk-critico)', border: '1px solid var(--risk-critico-bg)', cursor: 'pointer' }}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

function ModalEditarResponsable({
  responsable,
  onClose,
  onGuardado,
}: {
  responsable: ResponsableFirma;
  onClose: () => void;
  onGuardado: () => void;
}): JSX.Element {
  const [nombreCompleto, setNombreCompleto] = useState(responsable.nombreCompleto);
  const [identificacion, setIdentificacion] = useState(responsable.identificacion ?? '');
  const [cargo, setCargo] = useState(responsable.cargo ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const esNuevo = responsable.id === 0;

  async function handleGuardar(): Promise<void> {
    setError(null);
    setGuardando(true);
    try {
      if (esNuevo) {
        await crearResponsable({ tipo: responsable.tipo, nombreCompleto, identificacion, cargo });
      } else {
        await actualizarResponsable(responsable.id, { nombreCompleto, identificacion, cargo });
      }
      onGuardado();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 400 }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 18 }}>
          {esNuevo ? 'Nuevo' : 'Editar'} {responsable.tipo === 'DIRECTOR_ADMINISTRATIVO' ? 'Director Administrativo' : 'Revisor'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Nombre completo</label>
            <input value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }} />
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Cédula / identificación</label>
            <input value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }} />
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Cargo</label>
            <input value={cargo} onChange={(e) => setCargo(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }} />
          </div>
          {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} className="btn-secondary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>Cancelar</button>
            <button onClick={handleGuardar} disabled={guardando} className="btn-primary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfiguracionPage;
