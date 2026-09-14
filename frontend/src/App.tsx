import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import PlanillasListPage from './pages/PlanillasListPage';
import ProcesarPage from './pages/ProcesarPage';
import AuditoriaPage from './pages/AuditoriaPage';
import PlantillasPage from './pages/PlantillasPage';
import ReportesPage from './pages/ReportesPage';
import RevisarRiesgoPage from './pages/RevisarRiesgoPage';
import CorreccionesPage from './pages/CorreccionesPage';
import VisorDocumentoPage from './pages/VisorDocumentoPage';
import NuevaCargaWizardPage from './pages/NuevaCargaWizardPage';
import Layout from './components/Layout';
import { useAuthStore } from './store/authStore';
import UsuariosPage from './pages/UsuariosPage';
import CatalogosPage from './pages/CatalogosPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import DashboardPage from './pages/DashboardPage';

function PrivateRoute({ children }: { children: JSX.Element }): JSX.Element {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? children : <Navigate to="/login" replace />;
}

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/planillas" element={<PlanillasListPage />} />
          <Route path="/subir" element={<NuevaCargaWizardPage />} />
          <Route path="/procesar" element={<ProcesarPage />} />
          <Route path="/auditoria" element={<AuditoriaPage />} />
          <Route path="/plantillas" element={<PlantillasPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/revisar-riesgo/:id" element={<RevisarRiesgoPage />} />
          <Route path="/correcciones" element={<CorreccionesPage />} />
          <Route path="/documento" element={<VisorDocumentoPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/configuracion/catalogos" element={<CatalogosPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="/configuracion/firmas" element={<ConfiguracionPage />} />
          <Route path="/configuracion/catalogos-detalle" element={<CatalogosPage />} />
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/planillas" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
