// ============================================
// APP.JSX
// Define las rutas (URLs) de la aplicación.
// /login es pública. Todo lo demás requiere estar logueado
// (envuelto en RutaProtegida) y además queda dentro de AppLayout
// (sidebar + header), para que la navegación esté siempre visible.
// ============================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ExpedientesListPage from './pages/expedientes/ExpedientesListPage';
import ExpedienteDetailPage from './pages/expedientes/ExpedienteDetailPage';
import ExpedienteEditPage from './pages/expedientes/ExpedienteEditPage';
import ExpedienteCreatePage from './pages/expedientes/ExpedienteCreatePage';
import ClientesListPage from './pages/clientes/ClientesListPage';
import ClienteCreatePage from './pages/clientes/ClienteCreatePage';
import ClienteDetailPage from './pages/clientes/ClienteDetailPage';
import RutaProtegida from './components/RutaProtegida';
import AppLayout from './components/layout/AppLayout';
import ProximamentePage from './pages/comunes/ProximamentePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* --- Dashboard (placeholder, módulo pendiente) --- */}
        <Route
          path="/dashboard"
          element={
            <RutaProtegida>
              <AppLayout>
                <ProximamentePage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        {/* --- Expedientes --- */}
        <Route
          path="/expedientes"
          element={
            <RutaProtegida>
              <AppLayout>
                <ExpedientesListPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/expedientes/nuevo"
          element={
            <RutaProtegida>
              <AppLayout>
                <ExpedienteCreatePage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/expedientes/:id"
          element={
            <RutaProtegida>
              <AppLayout>
                <ExpedienteDetailPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/expedientes/:id/editar"
          element={
            <RutaProtegida>
              <AppLayout>
                <ExpedienteEditPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        {/* --- Clientes --- */}
        <Route
          path="/clientes"
          element={
            <RutaProtegida>
              <AppLayout>
                <ClientesListPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/clientes/nuevo"
          element={
            <RutaProtegida>
              <AppLayout>
                <ClienteCreatePage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/clientes/:id"
          element={
            <RutaProtegida>
              <AppLayout>
                <ClienteDetailPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        {/* --- Módulos aún sin backend: todos apuntan al mismo placeholder --- */}
        <Route
          path="/asesorias"
          element={
            <RutaProtegida>
              <AppLayout>
                <ProximamentePage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/calendario"
          element={
            <RutaProtegida>
              <AppLayout>
                <ProximamentePage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/honorarios"
          element={
            <RutaProtegida>
              <AppLayout>
                <ProximamentePage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/cobros"
          element={
            <RutaProtegida>
              <AppLayout>
                <ProximamentePage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        {/* Cualquier ruta desconocida, o la raíz "/", redirige a expedientes
            (que a su vez redirige a login si no hay sesión) */}
        <Route path="*" element={<Navigate to="/expedientes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;