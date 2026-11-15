# 04 · Cierre — Checklist DoD y Reporte Final

**Fecha:** 2026-11-14 — verificación integral ejecutada en T-08 y repetida en el cierre final (23:40 CST) tras corregir el seed.

## Checklist DoD

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | `docker compose up --build` levanta `db`, `api`, `web` desde cero sin pasos manuales | ✅ | Proyecto Compose limpio (`-p t08`, volumen nuevo): `db` healthy, `api` y `web` Up |
| 2 | `GET /api/v1/health` → 200 | ✅ | `{"status":"ok"}` |
| 3 | Migraciones y seed automáticos (80 usuarios: 3 HR + 77 EMPLOYEE, 5 salas) | ✅ | Log api: `Applying migration 20261114000000_init`, `[seed] OK (usuarios nuevos: 80)` |
| 4 | Seed idempotente | ✅ | Tras reinicio: `[seed] OK (usuarios nuevos: 0)`; siguen 80 usuarios / 5 salas. Cierre final: HR renombra y desactiva salas, se reinicia el api y siguen 5 salas con las ediciones intactas (D-12) |
| 5 | Persistencia entre reinicios (volumen `postgres_data`) | ✅ | Reserva creada sobrevive a `restart` y a `down` + `up` (sin `-v`) |
| 6 | API REST: crear reserva (201) y choque de horario (409) | ✅ | Verificado con peticiones reales con `x-user-id` |
| 7 | WebSocket `/ws` emite `DATA_INVALIDATED` al crear reserva | ✅ | Evento recibido por un cliente `WebSocket` conectado |
| 8 | Frontend sirve en `:5173` | ✅ | HTTP 200 |
| 9 | `npm test` verde en todo el monorepo | ✅ | shared 30/30, api 155/155, web 78/78 (263 tests) + `npm run typecheck` limpio en los 3 workspaces |
| 10 | Solo pruebas unitarias (sin Playwright/E2E) | ✅ | Solo Vitest + React Testing Library |
| 11 | Nombre de sala duplicado no rompe la API | ✅ | `PATCH /rooms/:id` con nombre existente → `409` (antes `500`) |
| 12 | Arquitectura hexagonal | ✅ | `domain/` y `application/` sin imports de `@prisma`, `express`, `ws` ni `pg`; Prisma y `ws` solo en `infrastructure/` |
| 13 | Estructura de entrega | ✅ | `README.md`, `CLAUDE.md`, `AGENTS.md`, `docs/00`–`04`, `docs/tareas/`, `docs/sesiones/` |

## Notas
- La verificación en Docker se hizo con un proyecto Compose separado para no tocar el volumen de desarrollo existente (`ai-builder_postgres_data`); el resultado es equivalente a un arranque desde cero.
- La interacción visual en navegador no se automatizó (prohibido E2E); el frontend se verificó por sus 67 tests unitarios, el build limpio de T-07 y la respuesta HTTP 200 del servicio.
- Los documentos de especificación (`00-decisiones.md`, `01-spec.md`, `02-backlog.md`) se movieron a `/docs` en el cierre final, como pide el formato de entrega (antes estaban en la raíz).
- La verificación del cierre final usó un proyecto Compose aislado (`-p finalcheck`, api en el puerto 3100) porque el stack de desarrollo ocupaba el 3000; se eliminó al terminar.
- Conocimiento adquirido durante el desarrollo (Prisma 7 + adapter, zona horaria, contrato de errores, menú ⋮) se trasladó a `01-spec.md` (§2, §4, §5, §6, §7) y a `00-decisiones.md` (D-11 a D-16) para que la reconstrucción desde cero no dependa del código borrado.

## Pendientes conocidos (fuera de alcance del MVP)
- Los casos de uso de consulta devuelven DTOs y los comandos devuelven entidades; el mapeo a DTO podría vivir solo en `infrastructure/http`.
- El offset UTC-6 está definido en tres sitios (`ReservationRules`, `ListReservations`, `web/shared/lib/time.ts`); convendría una constante única en `packages/shared`.
