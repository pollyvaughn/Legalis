// ============================================
// APP.JSX
// Define las rutas (URLs) de la aplicación.
// /login es pública. Todo lo demás requiere estar logueado
// (envuelto en RutaProtegida).
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/expedientes"
          element={
            <RutaProtegida>
              <ExpedientesListPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/expedientes/nuevo"
          element={
            <RutaProtegida>
              <ExpedienteCreatePage />
            </RutaProtegida>
          }
        />

        <Route
          path="/expedientes/:id"
          element={
            <RutaProtegida>
              <ExpedienteDetailPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/expedientes/:id/editar"
          element={
            <RutaProtegida>
              <ExpedienteEditPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/clientes"
          element={
            <RutaProtegida>
              <ClientesListPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/clientes/nuevo"
          element={
            <RutaProtegida>
              <ClienteCreatePage />
            </RutaProtegida>
          }
        />

        <Route
          path="/clientes/:id"
          element={
            <RutaProtegida>
              <ClienteDetailPage />
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