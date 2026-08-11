/*
  Warnings:

  - The `fuero` column on the `expedientes` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Fuero" AS ENUM ('CIVIL_COMERCIAL', 'LABORAL', 'PENAL', 'NINEZ_ADOLESCENCIA', 'CONTENCIOSO_ADMINISTRATIVO', 'OTRO');

-- CreateEnum
CREATE TYPE "RolParte" AS ENUM ('ACTOR', 'DEMANDADO', 'TERCERO', 'REPRESENTANTE_ESTATAL', 'DEFENSA');

-- AlterTable
ALTER TABLE "expedientes" ADD COLUMN     "objetoJuicio" TEXT,
ADD COLUMN     "secretaria" TEXT,
ADD COLUMN     "unidadFiscal" TEXT,
DROP COLUMN "fuero",
ADD COLUMN     "fuero" "Fuero";

-- CreateTable
CREATE TABLE "partes_procesales" (
    "id" SERIAL NOT NULL,
    "expedienteId" INTEGER NOT NULL,
    "clienteId" INTEGER,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "rol" "RolParte" NOT NULL,
    "rolEspecifico" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partes_procesales_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "partes_procesales" ADD CONSTRAINT "partes_procesales_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partes_procesales" ADD CONSTRAINT "partes_procesales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
