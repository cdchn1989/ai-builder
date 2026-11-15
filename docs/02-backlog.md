# 02 · Backlog de Ejecución (Atomic Scaffolding + TDD Unitario)

Cada tarea sigue el ciclo obligatorio **Red -> Green -> Refactor** con pruebas unitarias en Vitest, reporte en `/docs/tareas/T-XX.md`, actualización horaria en `/docs/03-bitacora.md` y un commit atómico (`feat(T-XX): ...`).

## T-01 · Scaffolding del Monorepo, Versiones y Docker Compose Persistente
- **Definition of Ready (DoR):**
  - *Dependencias:* Ninguna.
  - *Entradas:* Estructura de `/docs/01-spec.md` (Sección 1) y versiones fijadas en `CLAUDE.md` (Node 24 LTS con `openssl`, Postgres 16, Prisma `^7.10.1`, React `^19.3.0`, Vite `^8.3.0`, Vitest `^5.0.0`).
  - *Archivos a crear:* `package.json` (workspaces), `tsconfig.base.json` (`strict: true`), `docker-compose.yml` (con volumen nombrado `postgres_data:/var/lib/postgresql/data` y healthcheck), `apps/api/Dockerfile`, `apps/web/Dockerfile` y configuración de `Vitest`.
  - *Criterio de Aceptación:* `docker compose up --build` levanta los 3 servicios sin errores y `GET /api/v1/health` responde `200 OK`.

## T-02 · Contratos y Modelos Compartidos (`packages/shared`)
- **Definition of Ready (DoR):**
  - *Dependencias:* T-01 completada.
  - *Entradas:* Esquemas Zod y DTOs de `/docs/01-spec.md` (Sección 3).
  - *Archivos a crear:* `packages/shared/src/index.spec.ts` y `packages/shared/src/index.ts`.
  - *Criterio de Aceptación:* Tests unitarios en Vitest validando esquemas (`CreateReservationSchema`, `MoveReservationSchema`, `UpdateRoomSchema`) pasan en verde y compila a `dist/`.

## T-03 · Políticas de Roles y Autorización (`apps/api/src/domain/policies`)
- **Definition of Ready (DoR):**
  - *Dependencias:* T-02 completada.
  - *Entradas:* Reglas de permisos `EMPLOYEE` vs `HR` y *freeze window* de 30 min de `/docs/01-spec.md` (Sección 4).
  - *Archivos a crear:* `AuthorizationPolicy.spec.ts`, `AuthorizationPolicy.ts` y errores de dominio (`DomainError`, `ConflictError`, `ForbiddenError`, `ValidationError`).
  - *Criterio de Aceptación:* Tests unitarios cubriendo permisos de salas, reservas propias vs ajenas y *override* de 30 min para `HR` pasan en verde.

## T-04 · Casos de Uso de Dominio (`apps/api/src/application/use-cases`)
- **Definition of Ready (DoR):**
  - *Dependencias:* T-03 completada.
  - *Entradas:* Invariantes de negocio de `/docs/01-spec.md` (Sección 4, incluida la zona horaria UTC-6 de D-13) y puertos del dominio (`Clock`, `IdGenerator`, repositorios, `NotificationPort`).
  - *Archivos a crear:* `CreateReservation.spec.ts`, `CreateReservation.ts`, `MoveReservation.spec.ts`, `MoveReservation.ts`, `CancelReservation.spec.ts`, `CancelReservation.ts`, `ManageRoom.spec.ts`, `ManageRoom.ts`.
  - *Criterio de Aceptación:* Tests unitarios con repositorios *in-memory* validando choques de horario, duración (30 min–4 h), anticipación (máx. 14 días), horario (07:00–20:00), aforo, `movedByHr` y llamada a `NotificationPort` pasan en verde.

## T-05 · Adaptador Agnóstico Prisma, Migraciones y Seed Idempotente (`apps/api/prisma` y `infrastructure/db`)
- **Definition of Ready (DoR):**
  - *Dependencias:* T-04 completada.
  - *Entradas:* Esquema de `/docs/01-spec.md` (Sección 2) y D-03 de `/docs/00-decisiones.md`.
  - *Archivos a crear:* `apps/api/prisma/schema.prisma`, `prisma.config.ts` con `@prisma/adapter-pg` (D-11), migración inicial, `seed.ts` idempotente (`createMany` con `skipDuplicates` de 5 salas con `id` fijo y de 80 usuarios: 3 `HR` y 77 `EMPLOYEE`, D-12) y adaptadores Prisma mapeando a entidades puras de dominio (usando `$transaction` `Serializable` contra choques).
  - *Criterio de Aceptación:* Al arrancar `api` en Docker, ejecuta `npx prisma migrate deploy && npx prisma db seed` sin pasos manuales ni duplicados al reiniciar (ni siquiera si HR renombró una sala).

## T-06 · API REST, AuthMiddleware y Servidor WebSocket (`apps/api/src/infrastructure`)
- **Definition of Ready (DoR):**
  - *Dependencias:* T-05 completada.
  - *Entradas:* Contratos HTTP, formato de error y WS de `/docs/01-spec.md` (Sección 5) y D-14.
  - *Archivos a crear:* `AuthMiddleware.ts` (`x-user-id`), `errorHandler.ts`, controladores REST `/api/v1`, `WsNotificationAdapter.ts` (`/ws`) y sus pruebas unitarias `.spec.ts`.
  - *Criterio de Aceptación:* Tests unitarios de mapeo de errores (`400`, `401`, `403`, `404`, `409`, `422`) y broadcast WS pasan en verde.

## T-07 · Frontend React 19 Responsive + Jotai + TanStack Query (`apps/web`)
- **Definition of Ready (DoR):**
  - *Dependencias:* T-06 completada.
  - *Entradas:* Especificación de pantallas responsive y roles de `/docs/01-spec.md` (Secciones 6 y 7), D-13, D-15 y D-16.
  - *Archivos a crear:* `UserGateModal` (4 accesos rápidos + buscador de 80 usuarios en `sessionStorage`), `Header`, `CalendarView` (`RoomFilterSidebar` + `CalendarGrid`), `ReservationModal`, `ActionMenu` (menú ⋮), `RoomsAdminView`, `useWebSocketSync` y pruebas unitarias con Vitest + React Testing Library.
  - *Criterio de Aceptación:* Tests unitarios de frontend en Vitest pasan en verde y `npm run build` compila limpio.

## T-08 · Verificación Integral y Reporte de Cierre (`docker compose up --build`)
- **Definition of Ready (DoR):**
  - *Dependencias:* T-07 completada.
  - *Entradas:* Checklist DoD de `/docs/04-cierre.md`.
  - *Archivos a actualizar:* `/docs/03-bitacora.md`, `/docs/04-cierre.md` y exportación de sesiones en `/docs/sesiones/`.
  - *Criterio de Aceptación:* `docker compose up --build` levanta todo desde cero sin pasos manuales, persiste datos entre reinicios y `npm test` pasa en verde en todo el monorepo.
