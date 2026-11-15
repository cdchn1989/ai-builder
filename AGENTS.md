# AGENTS.md

Este repositorio usa **`CLAUDE.md`** como fuente única de reglas y contexto para cualquier agente (Claude Code, Codex u otro).

**Antes de hacer cualquier cosa, lee y aplica `CLAUDE.md` completo**, y luego los documentos de `/docs/` en este orden:

1. `/docs/00-decisiones.md` — decisiones y su porqué (D-01 a D-16).
2. `/docs/01-spec.md` — estructura, esquema de BD, contratos, reglas de negocio, pantallas y trampas conocidas (§7).
3. `/docs/02-backlog.md` — tareas `T-01` a `T-08` en orden, cada una con su DoR.

Resumen obligatorio (el detalle está en `CLAUDE.md`):
- Una tarea del backlog a la vez, TDD estricto con Vitest (Red → Green → Refactor), solo pruebas unitarias.
- Al terminar cada tarea: `/docs/tareas/T-XX.md`, fila con hora en `/docs/03-bitacora.md` y commit `feat(T-XX): ...`.
- Versiones fijadas: Prisma `^7.10.1` (nunca `@latest`), Node 24, Postgres 16, React 19, Vite 8, Vitest 5.
- Arquitectura hexagonal en `apps/api`: el dominio y los casos de uso no importan Prisma, Express ni `ws`.
