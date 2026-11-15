# 03 · Bitácora

| Fecha y hora | Tarea | Resultado |
|---|---|---|
| 2026-11-14 22:30 CST | T-01 | OK — monorepo, Vitest 5, Docker Compose (db/api/web) levantan; health 200; 5 tests verdes. Commit `chore(T-01)`. |
| 2026-11-14 22:34 CST | T-02 | OK — contratos Zod/DTOs/WsEvent en shared; 30 tests verdes; build a dist/ OK. Commit `feat(T-02)`. |
| 2026-11-14 22:35 CST | T-03 | OK — errores de dominio y AuthorizationPolicy (roles, propiedad, freeze window 30 min, override HR); 20 tests api verdes. Commit `feat(T-03)`. |
| 2026-11-14 22:41 CST | T-04 | OK — casos de uso Create/Move/Cancel/ManageRoom con repos in-memory, ReservationRules y NotFoundError; 77 tests api verdes. Commit `feat(T-04)`. |
| 2026-11-14 22:48 CST | T-05 | OK — Prisma 7 (adapter-pg), migración inicial, seed idempotente (5 salas, 80 usuarios) y repos Prisma con `Serializable`; 99 tests api verdes; Docker migra+siembra sin duplicados al reiniciar. Commit `feat(T-05)`. |
