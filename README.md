# Legalis System

Sistema web de gestión para un estudio jurídico y contable: clientes, expedientes,
asesorías y trámites, biblioteca de escritos forenses y, próximamente, plazos
procesales, honorarios y cobros.

Proyecto integrador — Ingeniería en Informática, Universidad Católica "Nuestra Señora
de la Asunción" (Sede regional Itapúa).

## Tecnologías

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express (API REST)
- **Base de datos:** PostgreSQL, con Prisma ORM

## Requisitos previos

- [Node.js](https://nodejs.org) 22.12 o superior
- [PostgreSQL](https://www.postgresql.org/download/) instalado y en ejecución

## Instalación

### 1. Base de datos

En una consola de PostgreSQL (`psql`), creá el usuario y la base:

```sql
CREATE USER legal_user WITH PASSWORD 'TU_CONTRASEÑA' CREATEDB;
CREATE DATABASE asesoria_db OWNER legal_user;
```

### 2. Backend

```bash
cd backend
npm install
```

Copiá `.env.example` como `.env` y completalo:

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL, ej: `postgresql://legal_user:TU_CONTRASEÑA@localhost:5432/asesoria_db` |
| `PORT` | Puerto del servidor |
| `JWT_SECRET` | Secreto para las sesiones. Generá uno con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Correo y contraseña (mínimo 8 caracteres) de la abogada |

Creá las tablas y el usuario inicial:

```bash
npx prisma migrate deploy
npm run seed
```

### 3. Frontend

```bash
cd frontend
npm install
```

Si el backend no corre en el puerto por defecto, ajustá la dirección base en
`frontend/src/api/axios.js`.

## Ejecución

En dos terminales separadas:

```bash
# Terminal 1 — backend
cd backend
npm run dev        # desarrollo (se reinicia solo)
# npm start        # uso normal

# Terminal 2 — frontend
cd frontend
npm run dev
```

Abrí en el navegador la dirección que muestra el frontend (por defecto
`http://localhost:5173`) e iniciá sesión con el correo y la contraseña del `.env`.

## Comandos útiles

| Comando | Dónde | Para qué |
|---|---|---|
| `npm test` | `backend/` | Ejecuta las pruebas automáticas (calendario de RUC) |
| `npm run seed -- --reset-password` | `backend/` | Cambia la contraseña de la abogada |
| `npm run build` | `frontend/` | Genera la versión de producción |

## Copias de seguridad

Con PostgreSQL instalado:

```bash
# Crear copia
pg_dump -U legal_user -F c -f copia_legalis.dump asesoria_db

# Restaurar una copia
pg_restore -U legal_user -d asesoria_db --clean copia_legalis.dump
```

Se recomienda guardar las copias periódicamente en un disco externo.

## Estructura del repositorio

```
backend/    API REST (src/modules/<módulo>: routes → controller → service) y esquema Prisma
frontend/   Aplicación React (pages, components, constants, utils)
```

## Guía de navegación del frontend

Para ubicar rápidamente pantallas, rutas, clases Tailwind y componentes reutilizables, consultá la [Guía rápida para el parcial](./GUIA-PARCIAL-FRONTEND.md).
