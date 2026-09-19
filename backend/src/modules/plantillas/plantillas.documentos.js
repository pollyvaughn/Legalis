// ============================================================
// PLANTILLAS.DOCUMENTOS — Módulo 1.4
// Genera el archivo descargable (.docx / .pdf) de una plantilla.
// Solo lleva el CUERPO del escrito (sin título ni metadatos).
// Ambas funciones devuelven una Promise<Buffer> (el archivo en memoria).
// ============================================================
const { Document, Packer, Paragraph, TextRun } = require('docx');
const PDFDocument = require('pdfkit');

// Normaliza saltos de línea de Windows (\r\n) a \n
const normalizar = (texto) => texto.replace(/\r\n/g, '\n');

// ------------------------------------------------------------
// WORD (.docx)
// Cada línea del texto pasa a ser un párrafo. Una línea vacía
// queda como párrafo vacío, así se conserva el espaciado original.
// size: 24 = 12 pt (la librería usa "medios puntos").
// ------------------------------------------------------------
const generarDocx = async (plantilla) => {
  const parrafos = normalizar(plantilla.contenido)
    .split('\n')
    .map(
      (linea) =>
        new Paragraph({
          children: [new TextRun({ text: linea, font: 'Times New Roman', size: 24 })],
          spacing: { after: 120 }, // espacio posterior en "twips" (120 = 6 pt)
        })
    );

  const documento = new Document({ sections: [{ children: parrafos }] });
  return Packer.toBuffer(documento);
};

// ------------------------------------------------------------
// PDF (.pdf)
// pdfkit escribe en "streams": junta los trozos que va emitiendo y,
// cuando termina ('end'), los une en un solo Buffer.
// Hoja A4, margen de 72 pt (= 1 pulgada), Times 12 pt.
// Las fuentes incluidas de pdfkit soportan tildes y ñ.
// ------------------------------------------------------------
const generarPdf = (plantilla) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 72 });
    const trozos = [];

    doc.on('data', (trozo) => trozos.push(trozo));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    doc.font('Times-Roman').fontSize(12);
    doc.text(normalizar(plantilla.contenido), { align: 'left', lineGap: 4 });
    doc.end(); // sin esto el PDF nunca termina de generarse
  });

module.exports = { generarDocx, generarPdf };