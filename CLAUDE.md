# Reglas y Contexto del Proyecto — Sistema de Reservas de Salas

## 1. Reglas de Ejecución y Metodología
- **Cero código manual:** Todo el código fuente, configuraciones y tests los escribe el agente siguiendo `/docs/01-spec.md` y `/docs/02-backlog.md`.
- **Atomic Scaffolding y Commits Atómicos:** Ejecuta una sola tarea del backlog a la vez (`T-01` a `T-08`). Al pasar los tests unitarios en verde, documenta en `/docs/tareas/T-XX.md`, actualiza `/docs/03-bitacora.md` con la hora y realiza `git add . && git commit -m "feat(T-XX): descripción breve"` antes de avanzar.
- **TDD Estricto (Red -> Green -> Refactor):**
  - Escribe primero el test unitario que falla (`vitest`), verifica que falle (Red), implementa el código mínimo para pasarlo (Green) y refactoriza.
  - **Alcance de pruebas:** Únicamente pruebas unitarias con `Vitest` (en `packages/shared`, `apps/api` y `apps/web` con React Testing Library). Prohibido instalar Playwright o montar suites E2E/integración pesadas.

## 2. Stack y Versiones Fijadas (Vigentes Noviembre 2026)
- **Runtime y BD Docker:** `node:24-alpine` (LTS hasta abril 2028; instalar `openssl` en Dockerfile para Prisma) y `postgres:16-alpine` (soporte hasta nov 2028).
- **Lenguaje y Validación:** `typescript@^5.9.0` (`strict: true` en todos los `tsconfig.json`), `zod@^3.23.8`.
- **ORM (Trampa de versión):** Instalar explícitamente `prisma@^7.10.1` y `@prisma/client@^7.10.1`. Prohibido usar `@latest` sin versión porque apunta a `8.0.0-rc`.
- **Backend:** `express@^4.21.0`, `ws@^8.18.0`.
- **Frontend:** `react@^19.3.0`, `react-dom@^19.3.0`, `vite@^8.3.0`, `@tanstack/react-query@^5.107.0`, `jotai@^3.0.1`, `tailwindcss@^3.4.14`.
- **Testing:** `vitest@^5.0.0`, `@testing-library/react@^16.0.0`, `jsdom`.

## 3. Principios de Ingeniería y Arquitectura (SOLID, KISS, DRY)
- **DRY:** Todos los modelos, DTOs, esquemas Zod y contratos WebSocket viven en `packages/shared` y son importados por `apps/api` y `apps/web`.
- **SOLID y Arquitectura Hexagonal (`apps/api`):**
  - `src/domain`: Entidades, errores de dominio, políticas de autorización y puertos (interfaces). Prohibido importar `prisma`, `express` o `ws` aquí.
  - `src/application`: Casos de uso puros que dependen exclusivamente de puertos del dominio.
  - `src/infrastructure`: Adaptadores concretos. **Uso agnóstico de Prisma:** Prisma vive exclusivamente como un adaptador en `infrastructure/db` implementando los puertos del dominio y mapeando modelos de Prisma a entidades puras de dominio, permitiendo cambiar de motor SQL o evolucionar el esquema (ej. multitenant) mediante migraciones sin tocar el dominio ni los casos de uso.
- **KISS:** Single-tenant (1 organización, 80 empleados, 5 salas). Sin Redis, sin Kubernetes, sin login con contraseñas ni envío de correos SMTP.

## 4. Reglas de Infraestructura, Persistencia Docker y UI
- **Resiliencia de Datos en Docker:** `docker-compose.yml` debe montar un volumen nombrado (`postgres_data:/var/lib/postgresql/data`) en `db` para conservar datos entre reinicios (`docker compose down` / `up`), y `prisma/seed.ts` debe ser estrictamente idempotente (`upsert` / `skipDuplicates`).
- **Arranque Automático:** `docker compose up --build` levanta `db` (con healthcheck), `api` (corriendo `npx prisma migrate deploy && npx prisma db seed` antes de iniciar el servidor) y `web` sin pasos manuales.
- **CORS y Endpoints:** `api` en puerto `3000` con `cors({ origin: '*' })` y WS en `/ws`. `web` en puerto `5173` usando `VITE_API_URL=http://localhost:3000` y `VITE_WS_URL=ws://localhost:3000/ws`.
- **Estética Responsive (KISS):** Tailwind CSS *mobile-first* con tamaños relativos (`w-full lg:w-64 xl:w-72`), paleta limpia (`#F8FAFC` fondo, `#FFFFFF` superficies, `#1E3A8A` acento primario) y navegación por estado en Jotai sin `react-router-dom`.
