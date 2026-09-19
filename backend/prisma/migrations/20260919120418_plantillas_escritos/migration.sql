-- CreateEnum
CREATE TYPE "ClaseEscrito" AS ENUM ('DE_FONDO', 'DE_MERO_TRAMITE');

-- CreateEnum
CREATE TYPE "CategoriaEscrito" AS ENUM ('DEMANDA', 'CONTESTACION', 'EXCEPCION', 'RECURSO', 'IMPULSO_PROCESAL', 'SOLICITUD_OFICIO', 'DENUNCIA', 'MEDIACION', 'MEDIDA_CAUTELAR', 'OTRO');

-- CreateEnum
CREATE TYPE "OrigenPlantilla" AS ENUM ('PROPIA', 'IA', 'OTRO');

-- CreateTable
CREATE TABLE "PlantillaEscrito" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descripcion" VARCHAR(300),
    "contenido" TEXT NOT NULL,
    "fuero" "Fuero",
    "clase" "ClaseEscrito" NOT NULL,
    "categoria" "CategoriaEscrito" NOT NULL,
    "origen" "OrigenPlantilla" NOT NULL DEFAULT 'PROPIA',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaEscrito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlantillaEscrito_fuero_clase_categoria_idx" ON "PlantillaEscrito"("fuero", "clase", "categoria");
