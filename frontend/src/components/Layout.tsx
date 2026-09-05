import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ITEMS_MENU = [
  { path: '/planillas', label: 'Planillas', roles: ['DIGITADOR', 'ADMIN', 'AUDITOR'] },
  { path: '/subir', label: 'Nueva carga', roles: ['DIGITADOR', 'ADMIN', 'AUDITOR'] },
  { path: '/auditoria', label: 'Auditoría', roles: ['AUDITOR', 'ADMIN'] },
  { path: '/correcciones', label: 'Correcciones', roles: ['AUDITOR', 'ADMIN'] },
  { path: '/plantillas', label: 'Plantillas base', roles: ['ADMIN'] },
  { path: '/usuarios', label: 'Usuarios', roles: ['ADMIN'] },
  { path: '/configuracion', label: 'Configuración', roles: ['ADMIN'] }];

function Layout(): JSX.Element {
  const usuario = useAuthStore((state) => state.usuario);
  const limpiarSesion = useAuthStore((state) => state.limpiarSesion);
  const navigate = useNavigate();

  const itemsVisibles = ITEMS_MENU.filter(
    (item) => usuario && item.roles.includes(usuario.rol),
  );

  function handleLogout(): void {
    limpiarSesion();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <aside style={{ width: 224, background: 'var(--brand-dark)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: '1px solid oklch(40% 0.08 240)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
              <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
              <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700 }}>SIGMA</span>
          </div>
          <p style={{ fontSize: 11.5, color: 'oklch(80% 0.02 240)', marginTop: 6, marginBottom: 0 }}>
            {usuario?.nombre} · {usuario?.rol}
          </p>
        </div>

        <nav style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {itemsVisibles.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'block', padding: '9px 12px', borderRadius: 6, fontSize: 13.5, fontWeight: 500,
                color: '#fff', textDecoration: 'none',
                background: isActive ? 'var(--brand)' : 'transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          style={{
            margin: 8, padding: '9px 12px', textAlign: 'left', borderRadius: 6, fontSize: 13.5,
            color: 'oklch(85% 0.02 240)', background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <main style={{ flex: 1, padding: 32, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
