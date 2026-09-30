// ============================================================
// PLANTILLAS CONTROLLER — Módulo 1.4
// Recibe req/res, valida la entrada y delega en el service.
// ============================================================
const service = require('./plantillas.service');
const documentos = require('./plantillas.documentos');

// Valores permitidos (espejo de los enums de schema.prisma).
// Se validan acá para devolver un 400 claro en vez de un error críptico de Prisma.
const FUEROS = ['CIVIL_COMERCIAL', 'LABORAL', 'PENAL', 'NINEZ_ADOLESCENCIA', 'CONTENCIOSO_ADMINISTRATIVO', 'OTRO'];
const CLASES = ['DE_FONDO', 'DE_MERO_TRAMITE'];
const CATEGORIAS = [
  'DEMANDA', 'CONTESTACION', 'EXCEPCION', 'RECURSO', 'IMPULSO_PROCESAL',
  'SOLICITUD_OFICIO', 'DENUNCIA', 'MEDIACION', 'MEDIDA_CAUTELAR', 'OTRO',
];
const ORIGENES = ['PROPIA', 'IA', 'OTRO'];

// ------------------------------------------------------------
// HELPER: validarCampos
// Devuelve un string con el error, o null si todo está bien.
// esCreacion = true exige los campos obligatorios.
// ------------------------------------------------------------
const validarCampos = (body, esCreacion) => {
  if (esCreacion) {
    if (!body.titulo || !body.titulo.trim()) return 'El título es obligatorio';
    if (!body.contenido || !body.contenido.trim()) return 'El contenido del escrito es obligatorio';
    if (!body.clase) return 'La clase (de fondo / de mero trámite) es obligatoria';
    if (!body.categoria) return 'La categoría es obligatoria';
  }
  if (body.titulo !== undefined && body.titulo !== null && body.titulo.length > 200) return 'El título no puede superar 200 caracteres';
  if (body.descripcion && body.descripcion.length > 300) return 'La descripción no puede superar 300 caracteres';
  if (body.fuero && !FUEROS.includes(body.fuero)) return 'Fuero inválido';
  if (body.clase && !CLASES.includes(body.clase)) return 'Clase inválida';
  if (body.categoria && !CATEGORIAS.includes(body.categoria)) return 'Categoría inválida';
  if (body.origen && !ORIGENES.includes(body.origen)) return 'Origen inválido';
  return null;
};

// GET /api/plantillas  — lista con filtros y paginación
const listar = async (req, res) => {
  try {
    const { fuero, clase, categoria, origen, busqueda } = req.query;
    // Los query params llegan como string, hay que pasarlos a número
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 10;

    const resultado = await service.listarPlantillas({ fuero, clase, categoria, origen, busqueda, pagina, limite });
    res.json(resultado);
  } catch (error) {
    console.error('Error al listar plantillas:', error);
    res.status(500).json({ error: 'Error al listar las plantillas' });
  }
};

// GET /api/plantillas/:id  — detalle completo (con contenido)
const obtener = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const plantilla = await service.obtenerPlantillaPorId(id);
    if (!plantilla) return res.status(404).json({ error: 'Plantilla no encontrada' });

    res.json(plantilla);
  } catch (error) {
    console.error('Error al obtener plantilla:', error);
    res.status(500).json({ error: 'Error al obtener la plantilla' });
  }
};

// POST /api/plantillas  — crear
const crear = async (req, res) => {
  try {
    const errorValidacion = validarCampos(req.body, true);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    const nueva = await service.crearPlantilla(req.body, req.usuario.id);    res.status(201).json(nueva);
  } catch (error) {
    console.error('Error al crear plantilla:', error);
    res.status(500).json({ error: 'Error al crear la plantilla' });
  }
};

// PUT /api/plantillas/:id  — actualizar (parcial)
const actualizar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const errorValidacion = validarCampos(req.body, false);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    // Si intentan vaciar un campo obligatorio, lo rechazamos
    if (req.body.titulo !== undefined && !req.body.titulo?.trim()) return res.status(400).json({ error: 'El título no puede quedar vacío' });
    if (req.body.contenido !== undefined && !req.body.contenido?.trim()) return res.status(400).json({ error: 'El contenido no puede quedar vacío' });

    const actualizada = await service.actualizarPlantilla(id, req.body, req.usuario.id);
    res.json(actualizada);
  } catch (error) {
    // P2025 = Prisma no encontró el registro a actualizar
    if (error.code === 'P2025') return res.status(404).json({ error: 'Plantilla no encontrada' });
    console.error('Error al actualizar plantilla:', error);
    res.status(500).json({ error: 'Error al actualizar la plantilla' });
  }
};

// DELETE /api/plantillas/:id  — eliminar definitivamente
const eliminar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    await service.eliminarPlantilla(id, req.usuario.id);    res.json({ mensaje: 'Plantilla eliminada' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Plantilla no encontrada' });
    console.error('Error al eliminar plantilla:', error);
    res.status(500).json({ error: 'Error al eliminar la plantilla' });
  }
};

// GET /api/plantillas/:id/descargar?formato=docx|pdf
// Devuelve el archivo generado (el .txt se genera en el frontend, no pasa por acá).
const descargar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const { formato } = req.query;
    if (!['docx', 'pdf'].includes(formato)) {
      return res.status(400).json({ error: 'Formato inválido (usar docx o pdf)' });
    }

    const plantilla = await service.obtenerPlantillaPorId(id);
    if (!plantilla) return res.status(404).json({ error: 'Plantilla no encontrada' });

    // Cada formato tiene su generador y su tipo MIME (el "tipo de archivo" para el navegador)
    const esDocx = formato === 'docx';
    const buffer = esDocx
      ? await documentos.generarDocx(plantilla)
      : await documentos.generarPdf(plantilla);

    res.setHeader(
      'Content-Type',
      esDocx
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf'
    );
    res.setHeader('Content-Disposition', `attachment; filename="escrito.${formato}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error al generar el archivo de la plantilla:', error);
    res.status(500).json({ error: 'Error al generar el archivo' });
  }
};

module.exports = { listar, obtener, crear, actualizar, eliminar, descargar };