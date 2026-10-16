// ============================================================
// DESCARGARPDF.JS — descarga un PDF que genera el backend
// Pide el archivo a la API y fuerza la descarga en el navegador
// (mismo patrón que los demás "Exportar PDF" del sistema).
//
// USO:
//   try {
//     await descargarPdf('/liquidaciones/5/proforma', 'proforma-5.pdf');
//   } catch (err) {
//     setError(err.message); // ya viene con el mensaje del backend
//   }
// ============================================================

import api from '../api/axios';

export async function descargarPdf(url, nombreArchivo, params) {
  try {
    // responseType 'blob': la respuesta es un archivo binario, no JSON
    const respuesta = await api.get(url, { params, responseType: 'blob' });

    // Truco para forzar la descarga: link invisible que se clickea solo
    const enlaceUrl = window.URL.createObjectURL(new Blob([respuesta.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = enlaceUrl;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(enlaceUrl); // libera la memoria del blob
  } catch (err) {
    // Con responseType 'blob' el error del backend también llega como Blob:
    // se lee como texto para mostrar el mensaje real (ej: "Expediente no encontrado").
    let mensaje = 'No se pudo generar el PDF';
    try {
      const texto = await err.response?.data?.text?.();
      if (texto) mensaje = JSON.parse(texto).error || mensaje;
    } catch {
      // si no se puede leer, queda el mensaje genérico
    }
    throw new Error(mensaje, { cause: err });
  }
}