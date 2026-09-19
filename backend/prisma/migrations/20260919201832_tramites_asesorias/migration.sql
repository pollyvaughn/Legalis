-- CreateEnum
CREATE TYPE "PeriodicidadTramite" AS ENUM ('MENSUAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "EstadoTramite" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'PRESENTADO', 'FINALIZADO');

-- CreateTable
CREATE TABLE "TipoTramite" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(300),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoTramite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObligacionPeriodica" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "tipoTramiteId" INTEGER NOT NULL,
    "periodicidad" "PeriodicidadTramite" NOT NULL,
    "mesAnual" INTEGER,
    "observaciones" VARCHAR(300),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObligacionPeriodica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tramite" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "tipoTramiteId" INTEGER NOT NULL,
    "obligacionId" INTEGER,
    "periodo" VARCHAR(7),
    "fechaVencimiento" DATE NOT NULL,
    "estado" "EstadoTramite" NOT NULL DEFAULT 'PENDIENTE',
    "descripcion" VARCHAR(300),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tramite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoRecibido" (
    "id" SERIAL NOT NULL,
    "tramiteId" INTEGER,
    "expedienteId" INTEGER,
    "tipoDocumento" VARCHAR(150) NOT NULL,
    "fechaRecepcion" DATE NOT NULL,
    "observaciones" VARCHAR(500),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoRecibido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoTramite_nombre_key" ON "TipoTramite"("nombre");

-- CreateIndex
CREATE INDEX "ObligacionPeriodica_clienteId_idx" ON "ObligacionPeriodica"("clienteId");

-- CreateIndex
CREATE INDEX "Tramite_clienteId_idx" ON "Tramite"("clienteId");

-- CreateIndex
CREATE INDEX "Tramite_fechaVencimiento_idx" ON "Tramite"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "Tramite_estado_idx" ON "Tramite"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "Tramite_obligacionId_periodo_key" ON "Tramite"("obligacionId", "periodo");

-- CreateIndex
CREATE INDEX "DocumentoRecibido_tramiteId_idx" ON "DocumentoRecibido"("tramiteId");

-- CreateIndex
CREATE INDEX "DocumentoRecibido_expedienteId_idx" ON "DocumentoRecibido"("expedienteId");

-- AddForeignKey
ALTER TABLE "ObligacionPeriodica" ADD CONSTRAINT "ObligacionPeriodica_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligacionPeriodica" ADD CONSTRAINT "ObligacionPeriodica_tipoTramiteId_fkey" FOREIGN KEY ("tipoTramiteId") REFERENCES "TipoTramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_tipoTramiteId_fkey" FOREIGN KEY ("tipoTramiteId") REFERENCES "TipoTramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_obligacionId_fkey" FOREIGN KEY ("obligacionId") REFERENCES "ObligacionPeriodica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoRecibido" ADD CONSTRAINT "DocumentoRecibido_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "Tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoRecibido" ADD CONSTRAINT "DocumentoRecibido_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
