// ============================================================
// EXPORTAR LISTADO PDF
// Helper genérico para exportar cualquier listado del sistema a
// PDF, en formato tabla. Lo usan los controllers de cada módulo
// (clientes, expedientes, trámites...) pasándole solo los datos
// ya armados — este archivo no sabe nada de Prisma ni de negocio.
//
// Mismo patrón de streaming que plantillas.documentos.js:
// se juntan los "trozos" que emite pdfkit y al final se arma
// un solo Buffer.
// ============================================================
const PDFDocument = require('pdfkit');

// ------------------------------------------------------------
// GENERAR PDF DE UN LISTADO
// Parámetros:
//   titulo    -> encabezado del documento (ej: "Listado de Clientes")
//   subtitulo -> línea chica debajo del título (ej: filtros aplicados)
//   columnas  -> array de { encabezado, ancho } (ancho en puntos,
//                deben sumar aprox. el ancho útil de la hoja: ~451pt
//                en A4 con margen de 72pt)
//   filas     -> array de arrays de strings, mismo orden que columnas
//
// Devuelve una Promise<Buffer> con el PDF ya armado.
// ------------------------------------------------------------
const generarListadoPdf = ({ titulo, subtitulo, columnas, filas }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' }); // horizontal: entran más columnas
    const trozos = [];

    doc.on('data', (trozo) => trozos.push(trozo));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    // --- Encabezado ---
    doc.font('Helvetica-Bold').fontSize(16).text(titulo, { align: 'left' });
    if (subtitulo) {
      doc.font('Helvetica').fontSize(9).fillColor('#555').text(subtitulo);
      doc.fillColor('#000'); // vuelve a negro para el resto
    }
    doc.moveDown(0.5);

    // --- Línea separadora bajo el encabezado ---
    const inicioTabla = doc.y;
    doc.moveTo(40, inicioTabla).lineTo(doc.page.width - 40, inicioTabla).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);

    // --- Encabezados de columna ---
    const filaAltura = 18;
    let y = doc.y;
    let x = 40;

    doc.font('Helvetica-Bold').fontSize(9);
    columnas.forEach((col) => {
      doc.text(col.encabezado, x, y, { width: col.ancho, ellipsis: true });
      x += col.ancho;
    });
    y += filaAltura;
    doc.moveTo(40, y - 4).lineTo(doc.page.width - 40, y - 4).strokeColor('#ccc').stroke();

    // --- Filas de datos ---
    doc.font('Helvetica').fontSize(9);
    filas.forEach((fila) => {
      // Salto de página manual: si no entra la fila siguiente, nueva hoja
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }

      x = 40;
      fila.forEach((valor, i) => {
        doc.text(String(valor ?? '—'), x, y, { width: columnas[i].ancho, ellipsis: true });
        x += columnas[i].ancho;
      });
      y += filaAltura;
    });

    // --- Pie: fecha de generación + total ---
    doc.moveDown(1);
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor('#777')
      .text(
        `Generado el ${new Date().toLocaleString('es-PY')} — ${filas.length} registro(s)`,
        40,
        doc.page.height - 40
      );

    doc.end();
  });

module.exports = { generarListadoPdf };