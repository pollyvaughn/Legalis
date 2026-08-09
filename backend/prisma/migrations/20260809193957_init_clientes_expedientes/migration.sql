-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "TipoAtencion" AS ENUM ('JUDICIAL', 'EXTRAJUDICIAL', 'AMBOS');

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "ruc" TEXT NOT NULL,
    "tipo" "TipoCliente" NOT NULL,
    "nombreRazonSocial" TEXT NOT NULL,
    "tipoAtencion" "TipoAtencion" NOT NULL DEFAULT 'JUDICIAL',
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes_persona_fisica" (
    "clienteId" INTEGER NOT NULL,
    "cedula" TEXT NOT NULL,
    "digitoVerificador" INTEGER NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),

    CONSTRAINT "clientes_persona_fisica_pkey" PRIMARY KEY ("clienteId")
);

-- CreateTable
CREATE TABLE "clientes_persona_juridica" (
    "clienteId" INTEGER NOT NULL,
    "tipoSocietario" TEXT NOT NULL,
    "fechaConstitucion" TIMESTAMP(3),

    CONSTRAINT "clientes_persona_juridica_pkey" PRIMARY KEY ("clienteId")
);

-- CreateTable
CREATE TABLE "expedientes" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "numeroExpediente" TEXT NOT NULL,
    "caratula" TEXT NOT NULL,
    "fuero" TEXT,
    "jurisdiccion" TEXT,
    "juzgado" TEXT,
    "montoJuicio" DECIMAL(15,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expedientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_ruc_key" ON "clientes"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_persona_fisica_cedula_key" ON "clientes_persona_fisica"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "expedientes_numeroExpediente_key" ON "expedientes"("numeroExpediente");

-- AddForeignKey
ALTER TABLE "clientes_persona_fisica" ADD CONSTRAINT "clientes_persona_fisica_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes_persona_juridica" ADD CONSTRAINT "clientes_persona_juridica_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
