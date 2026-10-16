// ============================================================
// GENERAR PROFORMA PDF — Módulo 3 (RF7)
// Dibuja el PDF de la PROFORMA de una liquidación de honorarios: el
// documento previo que se le entrega al cliente con el detalle del
// honorario (neto + IVA discriminado = total). NO es la factura legal.
//
// Este archivo solo dibuja: recibe los datos ya armados y formateados
// (ver liquidaciones.proforma.service.js). Hoja A4 vertical.
// Mismo patrón de streaming que exportarListadoPdf.js: se juntan los
// "trozos" que emite pdfkit y al final se arma un solo Buffer.
//
// Datos esperados:
//   numero        -> número de la liquidación (referencia de la proforma)
//   fechaEmision  -> "DD/MM/AAAA"
//   cliente       -> { nombre, ruc }
//   referencia    -> array de [etiqueta, valor] (expediente o trámite)
//   concepto      -> texto del concepto
//   calculo       -> cómo se calculó (ej: "Porcentaje: Gs. 10.000.000 × 10%")
//   ivaEtiqueta   -> "IVA 10%" | "IVA 5%" | "Exenta de IVA"
//   neto, iva, total -> montos ya formateados ("Gs. 1.000.000")
//   observaciones -> texto opcional (o null)
//
// Devuelve una Promise<Buffer>.
// ============================================================
const PDFDocument = require('pdfkit');

const MARGEN = 50;

const generarProformaPdf = (d) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGEN });
    const trozos = [];
    doc.on('data', (trozo) => trozos.push(trozo));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    const ancho = doc.page.width - MARGEN * 2; // ~495 pt útiles
    const derecha = doc.page.width - MARGEN;
    let y = MARGEN;

    // --- Línea fina horizontal ---
    const linea = (yLinea, color = '#ccc') =>
      doc.moveTo(MARGEN, yLinea).lineTo(derecha, yLinea).strokeColor(color).stroke();

    // --- Encabezado: título a la izquierda, número y fecha a la derecha ---
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#000').text('PROFORMA DE HONORARIOS', MARGEN, y);
    doc.font('Helvetica-Bold').fontSize(10).text(`Proforma N° ${d.numero}`, MARGEN, y + 2, { width: ancho, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor('#555').text(`Emitida el ${d.fechaEmision}`, MARGEN, y + 16, { width: ancho, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor('#555').text('Documento informativo previo al cobro. No es una factura ni un comprobante de pago.', MARGEN, y + 28, { width: ancho });
    y += 52;
    linea(y);
    y += 16;

    // --- Sección con pares etiqueta / valor ---
    const seccion = (titulo, pares) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text(titulo, MARGEN, y);
      y += 18;
      pares.forEach(([etiqueta, valor]) => {
        doc.font('Helvetica').fontSize(9).fillColor('#777').text(etiqueta, MARGEN, y, { width: 95 });
        doc.font('Helvetica').fontSize(10).fillColor('#000');
        const texto = String(valor ?? '—');
        const alto = doc.heightOfString(texto, { width: ancho - 100 });
        doc.text(texto, MARGEN + 100, y, { width: ancho - 100 });
        y += Math.max(alto, 12) + 5; // alto del texto (puede ocupar varias líneas) + aire
      });
      y += 10;
    };

    seccion('Cliente', [
      ['Nombre / Razón social', d.cliente.nombre],
      ['RUC', d.cliente.ruc],
    ]);
    seccion('Referencia', d.referencia);
    seccion('Detalle del honorario', [
      ['Concepto', d.concepto],
      ['Cálculo', d.calculo],
    ]);

    // --- Tabla de importes: neto, IVA discriminado y total ---
    const filaImporte = (etiqueta, monto, fuerte = false) => {
      doc.font(fuerte ? 'Helvetica-Bold' : 'Helvetica').fontSize(fuerte ? 12 : 10).fillColor('#000');
      doc.text(etiqueta, MARGEN, y, { width: ancho - 160 });
      doc.text(monto, derecha - 150, y, { width: 150, align: 'right' });
      y += fuerte ? 22 : 18;
    };

    linea(y - 4, '#999');
    y += 4;
    filaImporte('Honorario neto', d.neto);
    filaImporte(d.ivaEtiqueta, d.iva);
    linea(y - 2, '#999');
    y += 6;
    filaImporte('TOTAL A COBRAR', d.total, true);

    // --- Observaciones (opcionales) ---
    if (d.observaciones) {
      y += 14;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text('Observaciones', MARGEN, y);
      y += 16;
      doc.font('Helvetica').fontSize(9).fillColor('#333').text(d.observaciones, MARGEN, y, { width: ancho });
    }

    // --- Pie: va ANTES del margen inferior, o pdfkit agrega una hoja en blanco ---
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor('#777')
      .text(
        `Generado el ${new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion' })}`,
        MARGEN,
        doc.page.height - 70,
        { width: ancho }
      );

    doc.end();
  });

module.exports = { generarProformaPdf };