// ============================================
// CLIENTESLISTPAGE.JSX
// Lista de clientes con filtros y paginación, ambos resueltos
// en el BACKEND (GET /api/clientes). El frontend solo manda el
// estado y la búsqueda elegidos, y muestra la página que devuelve
// el servidor.
//
// Filtros: estado (activos/inactivos/todos) y búsqueda de texto
// (nombre/razón social, RUC, email y cédula).
// Paginación: 10 por página, con botones Anterior/Siguiente.
//
// La columna Estado (pill) solo se muestra en la vista "Todos",
// donde sí aporta información. Cada fila lleva al detalle del
// cliente. El botón "+ Nuevo cliente" abre ClienteFormModal como
// overlay; al guardar, se refresca la página actual sin salir.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ClienteFormModal from './ClienteFormModal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import TablaContainer from '../../components/ui/TablaContainer';
import { useAuth } from '../../context/AuthContext';

// Genera la inicial para el avatar circular de cada fila, ej: "Ricardo García" -> "R"
function inicial(nombre) {
  return nombre?.trim()?.[0]?.toUpperCase() || '?';
}

// Opciones del filtro de estado. "activos" es el default porque
// mantiene el comportamiento histórico del sistema.
const FILTROS_ESTADO = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
];

// Cantidad de clientes por página
const LIMITE_POR_PAGINA = 10;

function ClientesListPage() {
  const { esAbogado } = useAuth();

  // --- Datos que devuelve el backend ---
  const [clientes, setClientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // --- Estado de la pantalla ---
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);

  // --- Filtros y paginación ---
  const [pagina, setPagina] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('activos');

  // Búsqueda: dos estados. El "input" cambia con cada tecla; el
  // "debounced" se actualiza 400 ms después de que el usuario deja
  // de escribir, y ese es el que dispara la petición al backend.
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Evita doble click mientras se genera el PDF (puede tardar un
  // segundo si hay muchos clientes)
  const [exportando, setExportando] = useState(false);

  // ------------------------------------------
  // DEBOUNCE de la búsqueda.
  // Cada tecla programa la actualización del valor "real" a 400 ms;
  // si el usuario tipea de nuevo antes, el return del efecto cancela
  // el timer anterior. Al aplicarse la búsqueda, vuelve a página 1.
  // ------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusqueda(busquedaInput);
      setPagina(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [busquedaInput]);

  // ------------------------------------------
  // CARGA DE CLIENTES
  // Trae la página actual con los filtros aplicados. Se declara
  // como función común (no dentro del useEffect) para poder
  // reutilizarla al crear un cliente nuevo y refrescar la lista.
  // ------------------------------------------
  async function cargarClientes() {
    setCargando(true);
    setError('');
    try {
      // params: axios arma el query string y omite lo undefined
      const respuesta = await api.get('/clientes', {
        params: {
          estado: filtroEstado,
          busqueda: busqueda || undefined,
          pagina,
          limite: LIMITE_POR_PAGINA,
        },
      });
      // El backend devuelve { datos, total, pagina, limite, totalPaginas }
      setClientes(respuesta.data.datos);
      setTotal(respuesta.data.total);
      setTotalPaginas(respuesta.data.totalPaginas);
    } catch (err) {
      setError('No se pudieron cargar los clientes');
    } finally {
      setCargando(false);
    }
  }

  // Recarga cada vez que cambia el estado, la búsqueda (ya con debounce) o la página
  useEffect(() => {
    cargarClientes();
  }, [filtroEstado, busqueda, pagina]);

  // Cambia el filtro de estado y vuelve a la página 1
  // (si estás en la página 3 y filtrás, esa página puede no existir)
  function cambiarFiltroEstado(valor) {
    setFiltroEstado(valor);
    setPagina(1);
  }

  // La columna Estado solo aporta información cuando se mezclan
  // activos e inactivos en la misma vista.
  const mostrarColumnaEstado = filtroEstado === 'todos';

    // ------------------------------------------
  // EXPORTAR A PDF
  // Pide el PDF al backend con los MISMOS filtros que están
  // aplicados en pantalla (estado + búsqueda), no toda la tabla
  // sin filtrar. responseType: 'blob' le dice a axios que la
  // respuesta es binaria, no JSON.
  // ------------------------------------------
  async function exportarPdf() {
    setExportando(true);
    try {
      const respuesta = await api.get('/clientes/exportar', {
        params: {
          estado: filtroEstado,
          busqueda: busqueda || undefined,
        },
        responseType: 'blob',
      });

      // Truco para forzar la descarga: crea un link invisible,
      // le asigna el archivo como href, lo clickea solo y lo borra.
      const url = window.URL.createObjectURL(new Blob([respuesta.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'clientes.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url); // libera la memoria del blob
    } catch (err) {
      setError('No se pudo generar el PDF');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      {/* --- Encabezado de la página: título + acciones --- */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportarPdf} disabled={exportando}>
            {exportando ? 'Generando...' : 'Exportar PDF'}
          </Button>
          {esAbogado && <Button onClick={() => setMostrarModal(true)}>+ Nuevo cliente</Button>}
        </div>
      </div>

      {/* --- Filtro de estado: Activos / Inactivos / Todos --- */}
      <div className="mb-4 flex gap-2">
        {FILTROS_ESTADO.map((filtro) => (
          <button
            key={filtro.value}
            onClick={() => cambiarFiltroEstado(filtro.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filtroEstado === filtro.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filtro.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <TablaContainer
        busqueda={busquedaInput}
        onBusquedaChange={setBusquedaInput}
        placeholder="Buscar nombre, RUC, cédula, email..."
        cantidad={total}
        unidad="cliente"
      >
        {cargando ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">Cargando clientes...</p>
        ) : clientes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {busqueda || filtroEstado !== 'activos'
              ? 'No hay clientes que coincidan con este filtro.'
              : 'Todavía no hay clientes activos cargados.'}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-500">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">RUC</th>
                <th className="px-5 py-3">Email</th>
                {mostrarColumnaEstado && <th className="px-5 py-3">Estado</th>}
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr
                  key={cliente.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-5 py-3">
                    <Link
                      to={`/clientes/${cliente.id}`}
                      className="flex items-center gap-3 font-medium text-gray-900"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                        {inicial(cliente.nombreRazonSocial)}
                      </span>
                      {cliente.nombreRazonSocial}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {cliente.tipo === 'FISICA' ? 'Persona física' : 'Persona jurídica'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{cliente.ruc}</td>
                  <td className="px-5 py-3 text-gray-600">{cliente.email || '—'}</td>
                  {mostrarColumnaEstado && (
                    <td className="px-5 py-3">
                      <Badge tone={cliente.activo ? 'green' : 'gray'}>
                        {cliente.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TablaContainer>

      {/* --- Paginación: solo se muestra si hay más de una página --- */}
      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* --- Modal de alta de cliente (overlay) --- */}
      {mostrarModal && (
        <ClienteFormModal
          onClose={() => setMostrarModal(false)}
          onCreado={() => {
            setMostrarModal(false);
            cargarClientes(); // refresca la página actual con el cliente nuevo
          }}
        />
      )}
    </div>
  );
}

export default ClientesListPage;