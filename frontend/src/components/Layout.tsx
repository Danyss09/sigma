import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ITEMS_MENU = [
  { path: '/subir', label: 'Subir planilla', roles: ['DIGITADOR', 'ADMIN', 'AUDITOR'] },
  { path: '/procesar', label: 'Procesar matriz', roles: ['DIGITADOR', 'ADMIN', 'AUDITOR'] },
  { path: '/auditoria', label: 'Auditoría', roles: ['AUDITOR', 'ADMIN'] },
  { path: '/plantillas', label: 'Plantillas', roles: ['ADMIN'] },
  { path: '/reportes', label: 'Generar reportes', roles: ['AUDITOR', 'ADMIN'] },
  { path: '/planillas', label: 'Todas las planillas', roles: ['DIGITADOR', 'ADMIN', 'AUDITOR'] },
];

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
    <div className="min-h-screen flex bg-hospital-50">
      <aside className="w-56 bg-hospital-900 text-white flex flex-col">
        <div className="p-4 border-b border-hospital-700">
          <h1 className="text-lg font-bold">SIGMA</h1>
          <p className="text-xs text-hospital-100 mt-1">
            {usuario?.nombre} · {usuario?.rol}
          </p>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {itemsVisibles.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${
                  isActive ? 'bg-hospital-600' : 'hover:bg-hospital-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="m-2 px-3 py-2 text-sm text-left rounded hover:bg-hospital-700"
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
