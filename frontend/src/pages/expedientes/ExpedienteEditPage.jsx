// ============================================
// EXPEDIENTEEDITPAGE.JSX
// Formulario de edición completa de un expediente. Trae los
// datos actuales, precarga el form, y al guardar hace un PUT
// con todos los campos (el backend igual solo pisa los que
// vienen, gracias a siVino() en expedientes.service.js).
// No incluye clienteId: el backend no permite editarlo (ver
// nota en expedientes.service.js — decisión de diseño).
// ============================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';

function ExpedienteEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Un solo objeto de estado para todo el form, en vez de un
  // useState por campo — con 9 campos, es más prolijo así.
  const [form, setForm] = useState({
    numeroExpediente: '',
    caratula: '',
    fuero: '',
    jurisdiccion: '',
    juzgado: '',
    secretaria: '',
    objetoJuicio: '',
    montoJuicio: '',
    unidadFiscal: '',
  });

  // ------------------------------------------
  // Al cargar la página, trae el expediente actual y precarga
  // el form con sus valores (los que sean null los deja vacíos,
  // no "null" como texto).
  // ------------------------------------------
  useEffect(() => {
    async function cargarExpediente() {
      try {
        const respuesta = await api.get(`/expedientes/${id}`);
        const exp = respuesta.data;

        setForm({
          numeroExpediente: exp.numeroExpediente || '',
          caratula: exp.caratula || '',
          fuero: exp.fuero || '',
          jurisdiccion: exp.jurisdiccion || '',
          juzgado: exp.juzgado || '',
          secretaria: exp.secretaria || '',
          objetoJuicio: exp.objetoJuicio || '',
          montoJuicio: exp.montoJuicio ?? '',
          unidadFiscal: exp.unidadFiscal || '',
        });
      } catch (err) {
        setError('No se pudo cargar el expediente');
      } finally {
        setCargando(false);
      }
    }

    cargarExpediente();
  }, [id]);

  // ------------------------------------------
  // handleChange genérico: actualiza el campo correspondiente
  // del objeto form según el "name" del input que cambió.
  // Evita escribir un handler distinto por cada campo.
  // ------------------------------------------
  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    try {
      await api.put(`/expedientes/${id}`, {
        ...form,
        // montoJuicio vacío se manda como null en vez de ""
        montoJuicio: form.montoJuicio === '' ? null : form.montoJuicio,
      });

      // Vuelve al detalle para ver los cambios reflejados
      navigate(`/expedientes/${id}`);
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo guardar el expediente';
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <div className="p-8 text-gray-500 text-sm">Cargando expediente...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Link to={`/expedientes/${id}`} className="text-sm text-blue-600 hover:underline">
        ← Volver al detalle
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-4 max-w-2xl">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Editar expediente</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              N° Expediente
            </label>
            <input
              type="text"
              name="numeroExpediente"
              value={form.numeroExpediente}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carátula
            </label>
            <input
              type="text"
              name="caratula"
              value={form.caratula}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuero
              </label>
              <input
                type="text"
                name="fuero"
                value={form.fuero}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jurisdicción
              </label>
              <input
                type="text"
                name="jurisdiccion"
                value={form.jurisdiccion}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Juzgado
              </label>
              <input
                type="text"
                name="juzgado"
                value={form.juzgado}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secretaría
              </label>
              <input
                type="text"
                name="secretaria"
                value={form.secretaria}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objeto del juicio
            </label>
            <input
              type="text"
              name="objetoJuicio"
              value={form.objetoJuicio}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto del juicio
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="montoJuicio"
                value={form.montoJuicio}
                onChange={handleChange}
                placeholder="0"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad fiscal
              </label>
              <input
                type="text"
                name="unidadFiscal"
                value={form.unidadFiscal}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={guardando}
              className="bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <Link
              to={`/expedientes/${id}`}
              className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExpedienteEditPage;