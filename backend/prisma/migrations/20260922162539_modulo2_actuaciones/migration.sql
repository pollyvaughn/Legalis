-- CreateEnum
CREATE TYPE "TipoActuacion" AS ENUM ('PROVIDENCIA', 'RESOLUCION', 'SENTENCIA', 'ESCRITO_PRESENTADO', 'AUDIENCIA', 'NOTIFICACION', 'OFICIO', 'OTRO');

-- CreateTable
CREATE TABLE "actuaciones" (
    "id" SERIAL NOT NULL,
    "expedienteId" INTEGER NOT NULL,
    "parteProcesalId" INTEGER,
    "tipo" "TipoActuacion" NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fechaNotificacion" DATE,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actuaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "actuaciones_expedienteId_fecha_idx" ON "actuaciones"("expedienteId", "fecha");

-- AddForeignKey
ALTER TABLE "actuaciones" ADD CONSTRAINT "actuaciones_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actuaciones" ADD CONSTRAINT "actuaciones_parteProcesalId_fkey" FOREIGN KEY ("parteProcesalId") REFERENCES "partes_procesales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
