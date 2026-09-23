-- CreateEnum
CREATE TYPE "EstadoPlazo" AS ENUM ('PENDIENTE', 'CUMPLIDO');

-- CreateTable
CREATE TABLE "plazos_judiciales" (
    "id" SERIAL NOT NULL,
    "expedienteId" INTEGER NOT NULL,
    "actuacionId" INTEGER,
    "tipoPlazoId" INTEGER NOT NULL,
    "diasCantidad" INTEGER NOT NULL,
    "modalidad" "ModalidadPlazo" NOT NULL,
    "fechaNotificacion" DATE NOT NULL,
    "fechaVencimiento" DATE NOT NULL,
    "horaLimite" TIMESTAMP(3),
    "estado" "EstadoPlazo" NOT NULL DEFAULT 'PENDIENTE',
    "fechaCumplido" TIMESTAMP(3),
    "observaciones" VARCHAR(300),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plazos_judiciales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plazos_judiciales_estado_fechaVencimiento_idx" ON "plazos_judiciales"("estado", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "plazos_judiciales_expedienteId_idx" ON "plazos_judiciales"("expedienteId");

-- AddForeignKey
ALTER TABLE "plazos_judiciales" ADD CONSTRAINT "plazos_judiciales_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plazos_judiciales" ADD CONSTRAINT "plazos_judiciales_actuacionId_fkey" FOREIGN KEY ("actuacionId") REFERENCES "actuaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plazos_judiciales" ADD CONSTRAINT "plazos_judiciales_tipoPlazoId_fkey" FOREIGN KEY ("tipoPlazoId") REFERENCES "tipos_plazo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
