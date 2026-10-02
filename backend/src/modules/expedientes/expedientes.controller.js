// ============================================
// EXPEDIENTES.CONTROLLER.JS
// Maneja req/res de Express. Valida datos básicos,
// llama al service, y define códigos de respuesta HTTP.
// ============================================

const expedientesService = require('./expedientes.service');
const { ErrorNegocio } = require('../../utils/errores');
const { generarListadoPdf } = require('../../utils/exportarListadoPdf');

// Mensaje único para duplicados: se reutiliza en crear y actualizar
// para que la regla de negocio se lea igual en ambos lados.
const MENSAJE_DUPLICADO =
  'Ya existe un expediente con el mismo número, año, juzgado y carátula';

// ------------------------------------------
// POST /api/expedientes
// Crea un nuevo expediente
// ------------------------------------------
async function crear(req, res) {
  try {
    const { clienteId, numeroExpediente, anio, caratula, juzgado } = req.body;

    // Validación mínima de campos obligatorios
    // (anio y juzgado ahora son obligatorios: forman la identificación única)
    if (!clienteId || !numeroExpediente || !anio || !caratula || !juzgado) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: clienteId, numeroExpediente, anio, caratula, juzgado',
      });
    }

    // El año tiene que ser un entero razonable (evita "abc" o 20244)
    const anioNum = Number(anio);
    if (!Number.isInteger(anioNum) || anioNum < 1900 || anioNum > 2100) {
      return res.status(400).json({ error: 'El año no es válido' });
    }

    const expediente = await expedientesService.crearExpediente(req.body, req.usuario.id);
    res.status(201).json(expediente);
  } catch (error) {
    // Regla de negocio incumplida (cliente inexistente o inactivo): trae su propio código HTTP
    if (error instanceof ErrorNegocio) {
      return res.status(error.status).json({ error: error.message });
    }
    // P2002 = violación de la unicidad compuesta (número + año + juzgado + carátula)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: MENSAJE_DUPLICADO });
    }
    // P2003 = clienteId no existe (violación de foreign key)
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'El cliente indicado no existe' });
    }
    // Prisma lanza este error si fuero o estadoProcesal no es un valor válido del enum
    if (error.name === 'PrismaClientValidationError') {
      console.error('Error de validación de Prisma:', error.message);
      return res.status(400).json({ error: 'Algún valor enviado no es válido (revisá fuero y estado procesal)' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear el expediente' });
  }
}

// ------------------------------------------
// GET /api/expedientes
// Lista expedientes con filtros y paginación. Por defecto solo activos.
// Query params soportados (todos opcionales y combinables):
//   clienteId, estado, fuero, estadoProcesal, anio,
//   juzgado, busqueda, pagina, limite
// Responde { datos, total, pagina, limite, totalPaginas }.
// ------------------------------------------
async function listar(req, res) {
  try {
    const resultado = await expedientesService.listarExpedientes({
      clienteId: req.query.clienteId,
      estado: req.query.estado, // CAMBIO: 'activos' | 'inactivos' | 'todos'
      fuero: req.query.fuero,
      estadoProcesal: req.query.estadoProcesal,
      anio: req.query.anio,
      juzgado: req.query.juzgado,
      busqueda: req.query.busqueda,
      pagina: req.query.pagina,
      limite: req.query.limite,
    });
    res.json(resultado);
  } catch (error) {
    // Un valor de enum inválido en el filtro (ej: ?fuero=XXX) llega acá
    if (error.name === 'PrismaClientValidationError') {
      return res.status(400).json({ error: 'Algún filtro enviado no es válido (revisá fuero y estado procesal)' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al listar los expedientes' });
  }
}

// ------------------------------------------
// GET /api/expedientes/:id
// Por defecto solo trae el expediente si está activo.
// ?incluirInactivos=true permite traerlo aunque esté dado de baja
// (pensado para una futura pantalla de reactivación).
// ------------------------------------------
async function obtenerPorId(req, res) {
  try {
    const incluirInactivos = req.query.incluirInactivos === 'true';
    const expediente = await expedientesService.obtenerExpedientePorId(req.params.id, incluirInactivos);

    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }

    res.json(expediente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el expediente' });
  }
}

// ------------------------------------------
// PUT /api/expedientes/:id
// No permite editar clienteId (ver nota en el service).
// ------------------------------------------
async function actualizar(req, res) {
  try {
    const expediente = await expedientesService.actualizarExpediente(req.params.id, req.body, req.usuario.id);
    res.json(expediente);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    // P2002 = la edición chocó con otro expediente (misma combinación única)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: MENSAJE_DUPLICADO });
    }
    if (error.name === 'PrismaClientValidationError') {
      return res.status(400).json({ error: 'Algún valor enviado no es válido (revisá fuero y estado procesal)' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el expediente' });
  }
}

// ------------------------------------------
// GET /api/expedientes/exportar
// Exporta a PDF el listado de expedientes CON los filtros aplicados
// (mismos query params que el listado normal).
// ------------------------------------------
async function exportar(req, res) {
  try {
    const { datos } = await expedientesService.listarExpedientes({
      clienteId: req.query.clienteId,
      estado: req.query.estado,
      fuero: req.query.fuero,
      estadoProcesal: req.query.estadoProcesal,
      anio: req.query.anio,
      juzgado: req.query.juzgado,
      busqueda: req.query.busqueda,
      pagina: 1,
      limite: 10000,
    });

    // Arma el subtítulo con los filtros activos, para que el PDF
    // deje constancia de qué se está mostrando (igual que en clientes)
    const partesFiltro = [];
    if (req.query.estado && req.query.estado !== 'todos') partesFiltro.push(`Estado: ${req.query.estado}`);
    if (req.query.fuero) partesFiltro.push(`Fuero: ${req.query.fuero}`);
    if (req.query.estadoProcesal) partesFiltro.push(`Estado procesal: ${req.query.estadoProcesal}`);
    if (req.query.anio) partesFiltro.push(`Año: ${req.query.anio}`);
    if (req.query.juzgado) partesFiltro.push(`Juzgado: "${req.query.juzgado}"`);
    if (req.query.busqueda) partesFiltro.push(`Búsqueda: "${req.query.busqueda}"`);
    const subtitulo = partesFiltro.length ? partesFiltro.join(' · ') : 'Todos los expedientes';

    const columnas = [
      { encabezado: 'N° / Año', ancho: 70 },
      { encabezado: 'Carátula', ancho: 180 },
      { encabezado: 'Cliente', ancho: 150 },
      { encabezado: 'Juzgado', ancho: 110 },
      { encabezado: 'Estado procesal', ancho: 90 },
    ];

    const filas = datos.map((e) => [
      `${e.numeroExpediente}/${e.anio}`,
      e.caratula,
      e.cliente?.nombreRazonSocial,
      e.juzgado,
      e.estadoProcesal,
    ]);

    const buffer = await generarListadoPdf({
      titulo: 'Listado de Expedientes',
      subtitulo,
      columnas,
      filas,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="expedientes.pdf"');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar expedientes:', error);
    res.status(500).json({ error: 'Error al generar el PDF' });
  }
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  actualizar,
  exportar,
};