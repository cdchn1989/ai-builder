# Sistema de Reserva de Salas de Reunión

Aplicación interna *single-tenant* para gestionar y reservar las 5 salas de reunión de una organización de ~80 empleados en tiempo real, evitando choques de horario.

## Stack y Arquitectura
- **Monorepo TypeScript Estricto (`^5.9.0`):** `packages/shared`, `apps/api`, `apps/web`.
- **Backend:** Node.js 24 LTS + Arquitectura Hexagonal (Ports & Adapters) + Prisma 7 (`^7.10.1`) + PostgreSQL 16 + WebSockets (`ws`).
- **Frontend:** React 19 (`^19.3.0`) + TypeScript + Vite 8 + Tailwind CSS + TanStack Query v5 + Jotai v3.
- **Calidad:** TDD estricto (Red -> Green -> Refactor) con pruebas unitarias en Vitest v5 para backend y frontend.

## Cómo levantar el proyecto (Sin pasos manuales)

1. Clona el repositorio y ubícate en la raíz.
2. Ejecuta:
   ```bash
   docker compose up --build
   ```
3. Servicios disponibles automáticamente:
   - **Frontend (React + TS):** `http://localhost:5173`
   - **API REST + WebSocket:** `http://localhost:3000` (WS en `ws://localhost:3000/ws`)
   - **PostgreSQL 16:** `localhost:5432` (con volumen persistente `postgres_data`, migraciones y seed idempotente de 80 usuarios y 5 salas aplicados automáticamente).

## Cómo ejecutar las pruebas unitarias

- **En todo el monorepo (Shared + Backend + Frontend):**
  ```bash
  npm test
  ```

## Estructura de la entrega

| Ruta | Contenido |
|---|---|
| `README.md` | Cómo levantar, cómo probar y la instrucción única para el agente |
| `CLAUDE.md` / `AGENTS.md` | Reglas y contexto que el agente lee siempre (`AGENTS.md` remite a `CLAUDE.md` para Codex) |
| `docs/00-decisiones.md` | Cada duda encontrada, qué se decidió y por qué (D-01 a D-16) |
| `docs/01-spec.md` | Reglas de negocio, roles, alcance, modelo de datos, contratos de API/WS, pantallas y trampas conocidas |
| `docs/02-backlog.md` | Tareas `T-01` a `T-08` en orden de ejecución, cada una con su DoR |
| `docs/03-bitacora.md` | Registro con hora de todo lo que pasó |
| `docs/04-cierre.md` | Reporte de cierre con la DoD marcada y su evidencia |
| `docs/tareas/` | Un archivo por tarea con lo que hizo el agente |
| `docs/sesiones/` | Conversaciones exportadas del agente (anonimizadas) |

## Instrucción única para reconstrucción desde cero (Evaluación)

Si el código fuente fue eliminado, ejecuta exactamente este prompt en **Claude Code** o **Codex** desde la raíz del repositorio:

> "Lee completos `CLAUDE.md` (o `AGENTS.md`) y, dentro de `/docs/`, `00-decisiones.md`, `01-spec.md` y `02-backlog.md`. No inventes rutas, modelos, versiones ni reglas fuera de lo especificado ahí; respeta en especial las trampas de la sección 7 y del esquema Prisma 7 en `01-spec.md`. Construye el proyecto siguiendo Atomic Scaffolding y TDD estricto (Red -> Green -> Refactor) con pruebas unitarias en Vitest para backend y frontend, ejecutando las tareas en orden secuencial desde `T-01` hasta `T-08`; al terminar cada tarea en verde documenta `/docs/tareas/T-XX.md`, agrega su fila con hora a `/docs/03-bitacora.md` y haz un commit atómico (`feat(T-XX): ...`). En `T-08` ejecuta `docker compose up --build -d` y verifica sin ningún paso manual que PostgreSQL con volumen persistente, las migraciones, el seed de 80 usuarios y 5 salas, la API REST, el WebSocket y el frontend React funcionan, y completa `/docs/04-cierre.md` con la DoD y su evidencia."
