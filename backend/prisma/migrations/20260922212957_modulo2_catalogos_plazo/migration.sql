-- CreateEnum
CREATE TYPE "ModalidadPlazo" AS ENUM ('HABILES', 'CORRIDOS', 'HORAS');

-- CreateEnum
CREATE TYPE "FueroAplicable" AS ENUM ('CIVIL_COMERCIAL', 'LABORAL', 'PENAL', 'NINEZ_ADOLESCENCIA', 'CONTENCIOSO_ADMINISTRATIVO', 'OTRO', 'TODOS');

-- CreateTable
CREATE TABLE "tipos_plazo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "fuero" "FueroAplicable" NOT NULL DEFAULT 'TODOS',
    "diasDefault" INTEGER NOT NULL,
    "modalidadDefault" "ModalidadPlazo" NOT NULL DEFAULT 'HABILES',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_plazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dias_no_habiles" (
    "id" SERIAL NOT NULL,
    "fechaDesde" DATE NOT NULL,
    "fechaHasta" DATE,
    "descripcion" VARCHAR(200) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dias_no_habiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_plazo_nombre_fuero_key" ON "tipos_plazo"("nombre", "fuero");

-- CreateIndex
CREATE INDEX "dias_no_habiles_fechaDesde_idx" ON "dias_no_habiles"("fechaDesde");
