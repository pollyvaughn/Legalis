-- CreateEnum
CREATE TYPE "MetodoHonorarios" AS ENUM ('PORCENTAJE', 'JORNALES', 'MONTO_FIJO');

-- CreateEnum
CREATE TYPE "TasaIva" AS ENUM ('IVA_10', 'IVA_5', 'EXENTA');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('PENDIENTE', 'COBRADO_PARCIALMENTE', 'COBRADO');

-- CreateEnum
CREATE TYPE "EstadoGasto" AS ENUM ('PENDIENTE', 'COBRADO_PARCIALMENTE', 'COBRADO', 'ANULADO');

-- CreateTable
CREATE TABLE "liquidaciones_honorarios" (
    "id" SERIAL NOT NULL,
    "expedienteId" INTEGER,
    "tramiteId" INTEGER,
    "metodo" "MetodoHonorarios" NOT NULL,
    "concepto" VARCHAR(200),
    "montoBase" DECIMAL(15,2),
    "porcentaje" DECIMAL(5,2),
    "cantidadJornales" DECIMAL(8,2),
    "valorJornal" DECIMAL(15,2),
    "tasaIva" "TasaIva" NOT NULL,
    "montoNeto" DECIMAL(15,2) NOT NULL,
    "montoIva" DECIMAL(15,2) NOT NULL,
    "montoTotal" DECIMAL(15,2) NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" VARCHAR(300),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidaciones_honorarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos_reembolsables" (
    "id" SERIAL NOT NULL,
    "expedienteId" INTEGER,
    "tramiteId" INTEGER,
    "concepto" VARCHAR(200) NOT NULL,
    "fecha" DATE NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "comprobante" VARCHAR(100),
    "estado" "EstadoGasto" NOT NULL DEFAULT 'PENDIENTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gastos_reembolsables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "liquidaciones_honorarios_expedienteId_idx" ON "liquidaciones_honorarios"("expedienteId");

-- CreateIndex
CREATE INDEX "liquidaciones_honorarios_tramiteId_idx" ON "liquidaciones_honorarios"("tramiteId");

-- CreateIndex
CREATE INDEX "liquidaciones_honorarios_estado_idx" ON "liquidaciones_honorarios"("estado");

-- CreateIndex
CREATE INDEX "gastos_reembolsables_expedienteId_idx" ON "gastos_reembolsables"("expedienteId");

-- CreateIndex
CREATE INDEX "gastos_reembolsables_tramiteId_idx" ON "gastos_reembolsables"("tramiteId");

-- CreateIndex
CREATE INDEX "gastos_reembolsables_estado_idx" ON "gastos_reembolsables"("estado");

-- AddForeignKey
ALTER TABLE "liquidaciones_honorarios" ADD CONSTRAINT "liquidaciones_honorarios_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_honorarios" ADD CONSTRAINT "liquidaciones_honorarios_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "Tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_reembolsables" ADD CONSTRAINT "gastos_reembolsables_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_reembolsables" ADD CONSTRAINT "gastos_reembolsables_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "Tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
