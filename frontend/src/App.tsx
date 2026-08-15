import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import WizardSubirPlanilla from './pages/WizardSubirPlanilla';
import ProcesarPage from './pages/ProcesarPage';
import AuditoriaPage from './pages/AuditoriaPage';
import PlantillasPage from './pages/PlantillasPage';
import ReportesPage from './pages/ReportesPage';
import Layout from './components/Layout';
import { useAuthStore } from './store/authStore';
import PlanillasListPage from './pages/PlanillasListPage';

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
          <Route path="/subir" element={<WizardSubirPlanilla />} />
          <Route path="/procesar" element={<ProcesarPage />} />
          <Route path="/auditoria" element={<AuditoriaPage />} />
          <Route path="/plantillas" element={<PlantillasPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/planillas" element={<PlanillasListPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/planillas" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
