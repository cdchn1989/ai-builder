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

## Instrucción única para reconstrucción desde cero (Evaluación)

Si el código fuente fue eliminado, ejecuta exactamente este prompt en **Claude Code** o **Codex** desde la raíz del repositorio:

> "Lee detenidamente `CLAUDE.md`, `AGENTS.md` y todos los documentos dentro de `/docs/` (`00-decisiones.md`, `01-spec.md`, `02-backlog.md`). No inventes rutas, modelos, versiones ni reglas fuera de lo especificado en `CLAUDE.md` y `/docs/01-spec.md`. Construye el proyecto siguiendo Atomic Scaffolding y TDD estricto (Red -> Green -> Refactor) con pruebas unitarias en Vitest para backend y frontend, ejecutando las tareas en orden secuencial desde `T-01` hasta `T-08` y realizando un commit atómico (`feat(T-XX): ...`) al verificar cada tarea en verde. Al finalizar `T-08`, ejecuta `docker compose up --build -d` y verifica que PostgreSQL con volumen persistente, las migraciones, el seed de 80 usuarios y 5 salas, la API REST, WebSockets y el frontend React funcionen sin ningún paso manual."
