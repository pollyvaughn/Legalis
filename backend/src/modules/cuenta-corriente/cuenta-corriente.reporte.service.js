// ============================================================
// CUENTA-CORRIENTE.REPORTE.SERVICE.JS — Módulo 3 (RF8, reportes)
// Arma los datos de los PDF de cuenta corriente:
//   - Estado de cuenta de un EXPEDIENTE o de un TRÁMITE: todos sus
//     movimientos (honorarios y gastos) en orden cronológico + totales.
//   - Estado de cuenta de un CLIENTE (consolidado): una fila por
//     expediente/trámite + totales.
//   - PANEL global (menú "Honorarios & Gastos"): una fila por cliente
//     + totales del estudio.
// No genera el PDF ni conoce Express: devuelve { titulo, subtitulo,
// columnas, filas, multilinea, totales, nombreArchivo } listo para
// generarListadoPdf. Los números salen de cuenta-corriente.service,
// así el PDF siempre coincide con lo que se ve en pantalla.
//
// Los gastos ANULADOS se listan (para que quede constancia) pero no
// suman en los totales: igual que en pantalla.
// ============================================================

const prisma = require('../../config/database');
const cuentaService = require('./cuenta-corriente.service');
const { ErrorNegocio } = require('../../utils/errores');
const { fechaCortaDesdeTexto, fechaHoraCorta } = require('../../utils/formatoReportes');
const {
  ETIQUETA_METODO,
  ETIQUETA_ESTADO_COBRO,
  formatearGs,
  describirCalculo,
  describirIva,
  diaLocal,
} = require('../../utils/formatoHonorarios');

// Texto seguro para el nombre del archivo (sin barras ni espacios)
const nombreSeguro = (texto) => String(texto).replace(/[^\w.-]+/g, '_');

// "Situación al 15/10/2026 18:30" para el subtítulo
const situacionAl = () => `Situación al ${fechaHoraCorta(new Date())}`;

// ------------------------------------------------------------
// BLOQUE DE TOTALES (se dibuja a la derecha, debajo de la tabla).
// Sirve para los tres reportes: todos tienen la misma forma de resumen.
// El tercer elemento (true) resalta la línea en negrita.
// ------------------------------------------------------------
const bloqueTotales = (r) => [
  ['Honorarios (neto)', formatearGs(r.honorarios.neto)],
  ['IVA', formatearGs(r.honorarios.iva)],
  ['Honorarios con IVA', formatearGs(r.honorarios.total)],
  ['Gastos reembolsables', formatearGs(r.gastos.total)],
  ['Total a cobrar', formatearGs(r.totalACobrar), true],
  ['Cobrado', `- ${formatearGs(r.cobrado)}`],
  ['Saldo pendiente', formatearGs(r.saldo), true],
];

// ------------------------------------------------------------
// MOVIMIENTOS de un expediente o trámite (honorarios + gastos).
// "where" es { expedienteId } o { tramiteId }.
// Orden: por día; en el mismo día los honorarios van antes que los gastos.
// ------------------------------------------------------------
async function filasDeMovimientos(where) {
  const [liquidaciones, gastos] = await Promise.all([
    prisma.liquidacionHonorarios.findMany({ where }),
    prisma.gastoReembolsable.findMany({ where }),
  ]);

  const items = [
    ...liquidaciones.map((l) => ({
      dia: diaLocal(l.creadoEn), // fecha de carga, en hora de Paraguay
      orden: 0,
      id: l.id,
      fila: [
        fechaCortaDesdeTexto(diaLocal(l.creadoEn)),
        'Honorario',
        l.concepto || ETIQUETA_METODO[l.metodo],
        `${describirCalculo(l)} · ${describirIva(l)}`,
        ETIQUETA_ESTADO_COBRO[l.estado] ?? l.estado,
        formatearGs(l.montoTotal),
      ],
    })),
    ...gastos.map((g) => {
      const dia = new Date(g.fecha).toISOString().slice(0, 10); // @db.Date: ya es el día exacto
      const anulado = g.estado === 'ANULADO';
      const comprobante = g.comprobante ? `Comprobante: ${g.comprobante}` : '—';
      return {
        dia,
        orden: 1,
        id: g.id,
        fila: [
          fechaCortaDesdeTexto(dia),
          'Gasto',
          g.concepto,
          anulado ? `${comprobante} (anulado, no suma)` : comprobante,
          ETIQUETA_ESTADO_COBRO[g.estado] ?? g.estado,
          formatearGs(g.monto),
        ],
      };
    }),
  ].sort((a, b) => a.dia.localeCompare(b.dia) || a.orden - b.orden || a.id - b.id);

  return items.map((i) => i.fila);
}

// Columnas del estado de cuenta de expediente/trámite (suman ~760 pt)
const COLUMNAS_MOVIMIENTOS = [
  { encabezado: 'Fecha', ancho: 65 },
  { encabezado: 'Tipo', ancho: 65 },
  { encabezado: 'Concepto', ancho: 220 },
  { encabezado: 'Detalle', ancho: 200 },
  { encabezado: 'Estado', ancho: 100 },
  { encabezado: 'Importe', ancho: 110, alinear: 'right' },
];

// ------------------------------------------------------------
// ESTADO DE CUENTA de un EXPEDIENTE
// ------------------------------------------------------------
async function estadoDeExpediente(id) {
  const expediente = await prisma.expediente.findUnique({
    where: { id },
    select: {
      numeroExpediente: true,
      anio: true,
      caratula: true,
      cliente: { select: { nombreRazonSocial: true } },
    },
  });
  if (!expediente) throw new ErrorNegocio('Expediente no encontrado', 404);

  const [resumen, filas] = await Promise.all([
    cuentaService.resumenDeExpediente(id),
    filasDeMovimientos({ expedienteId: id }),
  ]);

  return {
    titulo: 'Estado de cuenta',
    subtitulo:
      `Expte. ${expediente.numeroExpediente}/${expediente.anio} — ${expediente.caratula}` +
      ` · Cliente: ${expediente.cliente.nombreRazonSocial} · ${situacionAl()}`,
    columnas: COLUMNAS_MOVIMIENTOS,
    filas,
    multilinea: true,
    totales: bloqueTotales(resumen),
    nombreArchivo: `estado-de-cuenta-expte-${nombreSeguro(expediente.numeroExpediente)}-${expediente.anio}.pdf`,
  };
}

// ------------------------------------------------------------
// ESTADO DE CUENTA de un TRÁMITE
// ------------------------------------------------------------
async function estadoDeTramite(id) {
  const tramite = await prisma.tramite.findUnique({
    where: { id },
    select: {
      periodo: true,
      tipoTramite: { select: { nombre: true } },
      cliente: { select: { nombreRazonSocial: true } },
    },
  });
  if (!tramite) throw new ErrorNegocio('Trámite no encontrado', 404);

  const [resumen, filas] = await Promise.all([
    cuentaService.resumenDeTramite(id),
    filasDeMovimientos({ tramiteId: id }),
  ]);

  return {
    titulo: 'Estado de cuenta',
    subtitulo:
      `Trámite: ${tramite.tipoTramite.nombre}${tramite.periodo ? ` (${tramite.periodo})` : ''}` +
      ` · Cliente: ${tramite.cliente.nombreRazonSocial} · ${situacionAl()}`,
    columnas: COLUMNAS_MOVIMIENTOS,
    filas,
    multilinea: true,
    totales: bloqueTotales(resumen),
    nombreArchivo: `estado-de-cuenta-tramite-${id}.pdf`,
  };
}

// ------------------------------------------------------------
// ESTADO DE CUENTA de un CLIENTE (consolidado)
// Una fila por expediente/trámite con movimientos (ya vienen ordenadas
// por saldo, el que más se debe primero).
// ------------------------------------------------------------
async function estadoDeCliente(id) {
  const resumen = await cuentaService.resumenDeCliente(id); // lanza 404 si no existe

  return {
    titulo: 'Estado de cuenta del cliente',
    subtitulo: `Cliente: ${resumen.cliente.nombreRazonSocial} · Todos sus expedientes y trámites · ${situacionAl()}`,
    columnas: [
      { encabezado: 'Expediente / Trámite', ancho: 235 },
      { encabezado: 'Tipo', ancho: 65 },
      { encabezado: 'Honorarios', ancho: 100, alinear: 'right' },
      { encabezado: 'Gastos', ancho: 90, alinear: 'right' },
      { encabezado: 'A cobrar', ancho: 90, alinear: 'right' },
      { encabezado: 'Cobrado', ancho: 90, alinear: 'right' },
      { encabezado: 'Saldo', ancho: 90, alinear: 'right' },
    ],
    filas: resumen.detalle.map((f) => [
      f.titulo,
      f.tipo === 'EXPEDIENTE' ? 'Expediente' : 'Trámite',
      formatearGs(f.honorariosTotal),
      formatearGs(f.gastosTotal),
      formatearGs(f.totalACobrar),
      formatearGs(f.cobrado),
      formatearGs(f.saldo),
    ]),
    multilinea: true,
    totales: bloqueTotales(resumen),
    nombreArchivo: `estado-de-cuenta-cliente-${id}.pdf`,
  };
}

// ------------------------------------------------------------
// PANEL GLOBAL: una fila por cliente con movimientos + totales del estudio
// ------------------------------------------------------------
async function panelGlobal() {
  const { totales, clientes } = await cuentaService.resumenGlobal();

  return {
    titulo: 'Honorarios y gastos por cliente',
    subtitulo:
      `${clientes.length} cliente(s) con movimientos, ${totales.clientesConSaldo} con saldo pendiente` +
      ` · ${situacionAl()}`,
    columnas: [
      { encabezado: 'Cliente', ancho: 230 },
      { encabezado: 'RUC', ancho: 85 },
      { encabezado: 'Honorarios', ancho: 100, alinear: 'right' },
      { encabezado: 'Gastos', ancho: 85, alinear: 'right' },
      { encabezado: 'A cobrar', ancho: 90, alinear: 'right' },
      { encabezado: 'Cobrado', ancho: 70, alinear: 'right' },
      { encabezado: 'Saldo', ancho: 100, alinear: 'right' },
    ],
    filas: clientes.map((c) => [
      c.activo ? c.nombreRazonSocial : `${c.nombreRazonSocial} (inactivo)`,
      c.ruc,
      formatearGs(c.honorariosTotal),
      formatearGs(c.gastosTotal),
      formatearGs(c.totalACobrar),
      formatearGs(c.cobrado),
      formatearGs(c.saldo),
    ]),
    multilinea: true,
    totales: bloqueTotales(totales),
    nombreArchivo: 'honorarios-y-gastos-por-cliente.pdf',
  };
}

module.exports = { estadoDeExpediente, estadoDeTramite, estadoDeCliente, panelGlobal };