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
//   columnas  -> array de { encabezado, ancho, alinear } (ancho en puntos,
//                deben sumar aprox. el ancho útil de la hoja: ~451pt
//                en A4 con margen de 72pt). "alinear" es opcional:
//                'right' alinea la columna a la derecha (para montos);
//                sin él queda a la izquierda, como siempre.
//   filas     -> array de arrays de strings, mismo orden que columnas
//   multilinea -> (opcional, por defecto false) si es true, los textos
//                largos se parten en varias líneas (la fila crece) en vez
//                de cortarse con "...", y los encabezados de columna se
//                repiten en cada hoja nueva. Pensado para listados con
//                texto libre (ej: descripción de una actuación). Los
//                listados de Módulo 1 no lo usan y siguen igual.
//   totales   -> (opcional, Módulo 3) bloque de totales que se dibuja
//                a la derecha, debajo de la tabla. Array de
//                [etiqueta, valor] o [etiqueta, valor, true]; el tercer
//                elemento (true) resalta la línea en negrita (ej: el
//                saldo). Los listados de los otros módulos no lo usan.
//
// Devuelve una Promise<Buffer> con el PDF ya armado.
// ------------------------------------------------------------
const generarListadoPdf = ({ titulo, subtitulo, columnas, filas, multilinea = false, totales = [] }) =>
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

    // --- Ancho real del texto de una columna ---
    // Multilínea deja 6pt de aire entre columnas; las columnas alineadas
    // a la derecha dejan 8pt más para que el número no toque la columna siguiente.
    const margenCelda = 6;
    const anchoTexto = (col) =>
      col.ancho - (multilinea ? margenCelda : 0) - (col.alinear === 'right' ? 8 : 0);
    const alineacion = (col) => (col.alinear === 'right' ? 'right' : 'left');

    // --- Encabezados de columna (función para poder repetirlos en cada hoja) ---
    const filaAltura = 18;
    const dibujarEncabezados = (yInicial) => {
      let xCol = 40;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
      columnas.forEach((col) => {
        doc.text(col.encabezado, xCol, yInicial, {
          width: col.ancho - (col.alinear === 'right' ? 8 : 0),
          align: alineacion(col),
          ellipsis: true,
        });
        xCol += col.ancho;
      });
      const yLinea = yInicial + filaAltura;
      doc.moveTo(40, yLinea - 4).lineTo(doc.page.width - 40, yLinea - 4).strokeColor('#ccc').stroke();
      doc.font('Helvetica').fontSize(9);
      return yLinea;
    };

    let y = dibujarEncabezados(doc.y);
    let x = 40;

    // --- Filas de datos ---
    doc.font('Helvetica').fontSize(9);
    filas.forEach((fila) => {
      // Modo multilínea: la altura de la fila es la de su celda más alta
      // (heightOfString mide cuánto ocupa el texto al partirse en el ancho
      // de la columna). Modo normal: altura fija, texto cortado con "...".
      let alturaFila = filaAltura;
      if (multilinea) {
        const alturaTexto = Math.max(
          ...fila.map((valor, i) =>
            doc.heightOfString(String(valor ?? '—'), { width: anchoTexto(columnas[i]) })
          )
        );
        alturaFila = Math.max(filaAltura, alturaTexto + 8);
      }

      // Salto de página manual: si no entra la fila siguiente, nueva hoja
      const limite = doc.page.height - 70; // deja lugar al pie (ver más abajo)
      if (multilinea ? y + alturaFila > limite : y > limite) {
        doc.addPage();
        y = multilinea ? dibujarEncabezados(40) : 40;
      }

      x = 40;
      fila.forEach((valor, i) => {
        const opciones = multilinea
          ? { width: anchoTexto(columnas[i]), align: alineacion(columnas[i]) }
          : { width: anchoTexto(columnas[i]), align: alineacion(columnas[i]), ellipsis: true };
        doc.text(String(valor ?? '—'), x, y, opciones);
        x += columnas[i].ancho;
      });
      y += alturaFila;

      // Línea fina entre filas (solo multilínea, para separar textos largos)
      if (multilinea) {
        doc.moveTo(40, y - 4).lineTo(doc.page.width - 40, y - 4).strokeColor('#eee').stroke();
      }
    });

    // --- Bloque de totales (opcional): a la derecha, debajo de la tabla ---
    // Si no entra en la hoja actual, pasa entero a una hoja nueva
    // (así el total nunca queda separado de su etiqueta).
    if (totales.length > 0) {
      const alturaLinea = 15;
      const limiteTotales = doc.page.height - 70; // mismo límite que las filas: deja lugar al pie
      if (y + 12 + totales.length * alturaLinea > limiteTotales) {
        doc.addPage();
        y = 40;
      }
      y += 8;

      const derecha = doc.page.width - 40;
      const xEtiqueta = derecha - 330;
      doc.moveTo(xEtiqueta, y - 3).lineTo(derecha, y - 3).strokeColor('#999').stroke();
      totales.forEach(([etiqueta, valor, fuerte]) => {
        doc.font(fuerte ? 'Helvetica-Bold' : 'Helvetica').fontSize(fuerte ? 10 : 9).fillColor('#000');
        doc.text(etiqueta, xEtiqueta, y + 2, { width: 200, align: 'right' });
        doc.text(String(valor), derecha - 120, y + 2, { width: 120, align: 'right' });
        y += alturaLinea;
      });
      doc.font('Helvetica').fontSize(9);
    }

    // --- Pie: fecha de generación + total ---
    doc.moveDown(1);
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor('#777')
      .text(
        `Generado el ${new Date().toLocaleString('es-PY')} — ${filas.length} registro(s)`,
        40,
        // 55 y no 40: el texto tiene que entrar ANTES del margen inferior (40),
        // si no pdfkit agrega una hoja en blanco solo para el pie.
        doc.page.height - 55
      );

    doc.end();
  });

module.exports = { generarListadoPdf };