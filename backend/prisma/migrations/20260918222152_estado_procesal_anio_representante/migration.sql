/*
  Warnings:

  - A unique constraint covering the columns `[numeroExpediente,anio,juzgado,caratula]` on the table `expedientes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `anio` to the `expedientes` table without a default value. This is not possible if the table is not empty.
  - Made the column `juzgado` on table `expedientes` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EstadoProcesal" AS ENUM ('EN_TRAMITE', 'EN_APELACION', 'SUSPENDIDO', 'ARCHIVADO', 'CONCLUIDO');

-- DropIndex
DROP INDEX "expedientes_numeroExpediente_key";

-- AlterTable
ALTER TABLE "clientes_persona_juridica" ADD COLUMN     "representanteLegal" TEXT;

-- AlterTable
ALTER TABLE "expedientes" ADD COLUMN     "anio" INTEGER NOT NULL,
ADD COLUMN     "estadoProcesal" "EstadoProcesal" NOT NULL DEFAULT 'EN_TRAMITE',
ALTER COLUMN "juzgado" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "expedientes_numeroExpediente_anio_juzgado_caratula_key" ON "expedientes"("numeroExpediente", "anio", "juzgado", "caratula");
