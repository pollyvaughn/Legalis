-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCobro" AS ENUM ('EMITIDO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoLineaCobro" AS ENUM ('HONORARIOS', 'GASTOS', 'ANTICIPO');

-- CreateTable
CREATE TABLE "cobros" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "expedienteId" INTEGER,
    "tramiteId" INTEGER,
    "fecha" DATE NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "referenciaPago" VARCHAR(100),
    "concepto" VARCHAR(200),
    "estado" "EstadoCobro" NOT NULL DEFAULT 'EMITIDO',
    "anuladoEn" TIMESTAMP(3),
    "motivoAnulacion" VARCHAR(300),
    "anuladoPorId" INTEGER,
    "creadoPorId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobros_lineas" (
    "id" SERIAL NOT NULL,
    "cobroId" INTEGER NOT NULL,
    "tipo" "TipoLineaCobro" NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "cobros_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cobros_numero_key" ON "cobros"("numero");

-- CreateIndex
CREATE INDEX "cobros_clienteId_idx" ON "cobros"("clienteId");

-- CreateIndex
CREATE INDEX "cobros_expedienteId_idx" ON "cobros"("expedienteId");

-- CreateIndex
CREATE INDEX "cobros_tramiteId_idx" ON "cobros"("tramiteId");

-- CreateIndex
CREATE INDEX "cobros_fecha_idx" ON "cobros"("fecha");

-- CreateIndex
CREATE INDEX "cobros_estado_idx" ON "cobros"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "cobros_lineas_cobroId_tipo_key" ON "cobros_lineas"("cobroId", "tipo");

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "Tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros_lineas" ADD CONSTRAINT "cobros_lineas_cobroId_fkey" FOREIGN KEY ("cobroId") REFERENCES "cobros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
