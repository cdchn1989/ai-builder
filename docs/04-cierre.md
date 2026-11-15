# 04 · Cierre — Checklist DoD y Reporte Final

**Fecha:** 2026-11-14 — verificación integral ejecutada en T-08.

## Checklist DoD

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | `docker compose up --build` levanta `db`, `api`, `web` desde cero sin pasos manuales | ✅ | Proyecto Compose limpio (`-p t08`, volumen nuevo): `db` healthy, `api` y `web` Up |
| 2 | `GET /api/v1/health` → 200 | ✅ | `{"status":"ok"}` |
| 3 | Migraciones y seed automáticos (80 usuarios: 3 HR + 77 EMPLOYEE, 5 salas) | ✅ | Log api: `Applying migration 20261114000000_init`, `[seed] OK (usuarios nuevos: 80)` |
| 4 | Seed idempotente | ✅ | Tras reinicio: `[seed] OK (usuarios nuevos: 0)`; siguen 80 usuarios / 5 salas |
| 5 | Persistencia entre reinicios (volumen `postgres_data`) | ✅ | Reserva creada sobrevive a `restart` y a `down` + `up` (sin `-v`) |
| 6 | API REST: crear reserva (201) y choque de horario (409) | ✅ | Verificado con peticiones reales con `x-user-id` |
| 7 | WebSocket `/ws` emite `DATA_INVALIDATED` al crear reserva | ✅ | Evento recibido por un cliente `WebSocket` conectado |
| 8 | Frontend sirve en `:5173` | ✅ | HTTP 200 |
| 9 | `npm test` verde en todo el monorepo | ✅ | shared 30/30, api 152/152, web 67/67 (249 tests) |
| 10 | Solo pruebas unitarias (sin Playwright/E2E) | ✅ | Solo Vitest + React Testing Library |

## Notas
- La verificación en Docker se hizo con un proyecto Compose separado para no tocar el volumen de desarrollo existente (`ai-builder_postgres_data`); el resultado es equivalente a un arranque desde cero.
- La interacción visual en navegador no se automatizó (prohibido E2E); el frontend se verificó por sus 67 tests unitarios, el build limpio de T-07 y la respuesta HTTP 200 del servicio.
- Los documentos de especificación (`00-decisiones.md`, `01-spec.md`, `02-backlog.md`) residen en la raíz del repositorio.
