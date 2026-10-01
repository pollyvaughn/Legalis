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
import ClientesListPage from './pages/clientes/ClientesListPage';
import ClienteDetailPage from './pages/clientes/ClienteDetailPage';
import RutaProtegida from './components/RutaProtegida';
import AppLayout from './components/layout/AppLayout';
import ProximamentePage from './pages/comunes/ProximamentePage';
import PlantillasPage from './pages/plantillas/PlantillasPage';
import CatalogoTramitesPage from './pages/asesorias/CatalogoTramitesPage';
import AsesoriasPage from './pages/asesorias/AsesoriasPage';
import CambiarPasswordPage from './pages/CambiarPasswordPage';
import PerfilPage from './pages/PerfilPage';
import UsuariosPage from './pages/usuarios/UsuariosPage';
import CalendarioPlazosPage from './pages/calendario/CalendarioPlazosPage';
import CatalogoTiposPlazoPage from './pages/calendario/CatalogoTiposPlazoPage';
import CatalogoDiasNoHabilesPage from './pages/calendario/CatalogoDiasNoHabilesPage';
import AuditoriaPage from './pages/auditoria/AuditoriaPage';

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
          path="/expedientes/:id"
          element={
            <RutaProtegida>
              <AppLayout>
                <ExpedienteDetailPage />
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
          path="/clientes/:id"
          element={
            <RutaProtegida>
              <AppLayout>
                <ClienteDetailPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        {/* --- Plantillas --- */}
        <Route
          path="/plantillas"
          element={
            <RutaProtegida>
              <AppLayout>
                <PlantillasPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/asesorias"
          element={
          <RutaProtegida>
            <AppLayout>
              <AsesoriasPage />
            </AppLayout>
          </RutaProtegida>
          }
        />

        <Route
          path="/calendario"
          element={
            <RutaProtegida>
              <AppLayout>
                <CalendarioPlazosPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/calendario/tipos-plazo"
          element={
            <RutaProtegida>
              <AppLayout>
                <CatalogoTiposPlazoPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        <Route
          path="/calendario/dias-no-habiles"
          element={
            <RutaProtegida>
              <AppLayout>
                <CatalogoDiasNoHabilesPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        {/* --- Módulos aún sin backend: todos apuntan al mismo placeholder --- */}

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

        <Route
          path="/asesorias/catalogo"
          element={
            <RutaProtegida>
              <AppLayout>
                <CatalogoTramitesPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

                {/* --- Cambio de contraseña obligatorio ---
            Sin AppLayout (sin sidebar) a propósito, y con permitirConPasswordTemporal
            para que RutaProtegida no lo redirija a sí mismo en un bucle. */}
        <Route
          path="/cambiar-password"
          element={
            <RutaProtegida permitirConPasswordTemporal>
              <CambiarPasswordPage />
            </RutaProtegida>
          }
        />

        {/* --- Mi perfil (ABOGADO y ASISTENTE) --- */}
        <Route
          path="/perfil"
          element={
            <RutaProtegida>
              <AppLayout>
                <PerfilPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        {/* --- Gestión de usuarios (solo ABOGADO) --- */}
        <Route
          path="/usuarios"
          element={
            <RutaProtegida soloAbogado>
              <AppLayout>
                <UsuariosPage />
              </AppLayout>
            </RutaProtegida>
          }
        />

        {/* --- Auditoría (solo ABOGADO) --- */}
        <Route
          path="/auditoria"
          element={
            <RutaProtegida soloAbogado>
              <AppLayout>
                <AuditoriaPage />
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