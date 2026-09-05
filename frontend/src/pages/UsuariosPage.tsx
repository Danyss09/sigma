import { useState, useEffect } from 'react';
import BotonRegresar from '../components/BotonRegresar';
import { listarUsuarios, crearUsuario, actualizarUsuario, resetearPasswordUsuario, Usuario } from '../api/adminApi';

function UsuariosPage(): JSX.Element {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [resetenado, setResetenado] = useState<Usuario | null>(null);

  async function cargar(): Promise<void> {
    setCargando(true);
    try {
      const data = await listarUsuarios();
      setUsuarios(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar la lista de usuarios');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleToggleActivo(u: Usuario): Promise<void> {
    try {
      await actualizarUsuario(u.id, { activo: !u.activo });
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al actualizar el usuario');
    }
  }

  return (
    <div>
      <BotonRegresar to="/planillas" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>Usuarios</div>
          <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
            Administración de cuentas y roles (Administrador, Auditor, Digitador).
          </div>
        </div>
        <button onClick={() => setMostrarCrear(true)} className="btn-primary" style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
          + Nuevo usuario
        </button>
      </div>

      {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.7fr 1.2fr', padding: '12px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <div>Nombre / Email</div><div>Rol</div><div>Estado</div><div>Acciones</div>
        </div>

        {cargando && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando...</div>}

        {!cargando &&
          usuarios.map((u) => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.7fr 1.2fr', padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.nombre}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
              </div>
              <div style={{ fontSize: 13 }}>{u.rol}</div>
              <div>
                <span style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                  background: u.activo ? 'var(--risk-bajo-bg)' : 'var(--risk-critico-bg)',
                  color: u.activo ? 'var(--risk-bajo)' : 'var(--risk-critico)',
                }}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setResetenado(u)} className="btn-secondary" style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>
                  Resetear clave
                </button>
                <button onClick={() => handleToggleActivo(u)} className="btn-secondary" style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
      </div>

      {mostrarCrear && (
        <ModalCrear
          onClose={() => setMostrarCrear(false)}
          onCreado={() => {
            setMostrarCrear(false);
            cargar();
          }}
        />
      )}

      {resetenado && (
        <ModalResetear
          usuario={resetenado}
          onClose={() => setResetenado(null)}
          onListo={() => setResetenado(null)}
        />
      )}
    </div>
  );
}

function ModalCrear({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }): JSX.Element {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('DIGITADOR');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleCrear(): Promise<void> {
    setError(null);
    setGuardando(true);
    try {
      await crearUsuario({ nombre, email, password, rol });
      onCreado();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al crear el usuario');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 400 }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 18 }}>Nuevo usuario</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Nombre completo" value={nombre} onChange={setNombre} />
          <Campo label="Email" value={email} onChange={setEmail} type="email" />
          <Campo label="Contraseña temporal" value={password} onChange={setPassword} type="password" />
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }}>
              <option value="DIGITADOR">Digitador</option>
              <option value="AUDITOR">Auditor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} className="btn-secondary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>Cancelar</button>
            <button onClick={handleCrear} disabled={guardando} className="btn-primary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
              {guardando ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalResetear({ usuario, onClose, onListo }: { usuario: Usuario; onClose: () => void; onListo: () => void }): JSX.Element {
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleResetear(): Promise<void> {
    setError(null);
    setGuardando(true);
    try {
      await resetearPasswordUsuario(usuario.id, nuevaPassword);
      onListo();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al resetear la contraseña');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 380 }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Resetear clave</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>{usuario.nombre} ({usuario.email})</div>
        <Campo label="Nueva contraseña temporal" value={nuevaPassword} onChange={setNuevaPassword} type="password" />
        {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13, marginTop: 10 }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>Cancelar</button>
          <button onClick={handleResetear} disabled={guardando} className="btn-primary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
            {guardando ? 'Guardando...' : 'Resetear'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }): JSX.Element {
  return (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
    </div>
  );
}

export default UsuariosPage;
