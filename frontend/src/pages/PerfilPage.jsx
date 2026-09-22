// ============================================
// PERFILPAGE.JSX
// "Mi perfil": muestra los datos del usuario logueado y permite
// cambiar SU PROPIA contraseña. La ven ABOGADO y ASISTENTE.
// ============================================

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import FormCambiarPassword from '../components/FormCambiarPassword';

function PerfilPage() {
  const { usuario } = useAuth();
  const [exito, setExito] = useState(false);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mi perfil</h1>

      {/* --- Datos de la cuenta (solo lectura) --- */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Nombre</dt>
            <dd className="text-gray-900 font-medium">{usuario?.nombre}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900 font-medium">{usuario?.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Rol</dt>
            <dd className="text-gray-900 font-medium">{usuario?.rol}</dd>
          </div>
        </dl>
      </div>

      {/* --- Cambio de contraseña --- */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Cambiar contraseña</h2>

        {exito && (
          <p className="mb-4 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            Contraseña actualizada correctamente.
          </p>
        )}

        <FormCambiarPassword onExito={() => setExito(true)} />
      </div>
    </div>
  );
}

export default PerfilPage;