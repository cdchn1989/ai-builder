# 00 · Registro de Decisiones Arquitectónicas (ADR)

## D-01: PostgreSQL 16 con Persistencia en Volumen Docker sobre SQLite
- **Contexto:** MVP interno para ~80 empleados y 5 salas de reunión ejecutado localmente con Docker Compose.
- **Decisión:** Utilizar **PostgreSQL 16** en contenedor independiente con volumen nombrado (`postgres_data:/var/lib/postgresql/data`) y `seed.ts` idempotente.
- **Por qué:** Cumple explícitamente la DoD de levantar un servicio de BD en `docker compose up`, evita bloqueos de archivo completo bajo escrituras concurrentes, garantiza aislamiento ACID `Serializable` contra choques de reserva y asegura que los datos sobrevivan entre reinicios de contenedores.

## D-02: Docker Compose sobre Kubernetes
- **Contexto:** Restricción de ejecución local sin despliegue en la nube.
- **Decisión:** Orquestar 3 servicios (`db`, `api`, `web`) mediante `docker-compose.yml`.
- **Por qué:** Kubernetes es sobreingeniería para una aplicación interna de 80 usuarios (**KISS**).

## D-03: Monorepo TypeScript + Arquitectura Hexagonal + Prisma ORM Agnóstico
- **Contexto:** Necesidad de contratos compartidos estrictos y capacidad de evolución futura sin reescribir lógica de negocio.
- **Decisión:** Monorepo TypeScript (`packages/shared`, `apps/api`, `apps/web`) con Arquitectura Hexagonal en backend y **Prisma 7** aislado en la capa de infraestructura detrás de puertos de repositorio.
- **Por qué:** Compartir esquemas Zod y DTOs aplica **DRY**. Encapsular Prisma como un adaptador agnóstico detrás de puertos hexagonales aplica **SOLID** (Inversión de Dependencias): el dominio nunca conoce tipos de Prisma, lo que permite cambiar de motor de BD o agregar columnas estructurales (como `tenantId` para multitenancy) vía migraciones sin alterar las reglas de negocio.

## D-04: Single-Tenant hoy (Preparado para Multitenant)
- **Contexto:** El cliente es una única empresa de 80 personas.
- **Decisión:** Implementar el modelo de datos y canales en tiempo real como *single-tenant*.
- **Por qué:** Aplicar **KISS** en un alcance de 2 horas, dejando el adaptador Prisma preparado para futuras migraciones multitenant.

## D-05: WebSockets en Memoria + TanStack Query + Jotai (Sin Polling ni Redis)
- **Contexto:** Evitar que dos empleados vean disponibilidad desactualizada simultáneamente.
- **Decisión:** **Jotai v3** (persistido en `sessionStorage` para aislar pestañas), **TanStack Query v5** para caché HTTP y servidor **WebSocket (`ws`)** en Node.js que emite un `broadcast` en memoria (`DATA_INVALIDATED`) para invalidar queries en los clientes conectados.
- **Por qué:** Elimina *polling* periódico innecesario y evita meter Redis al correr una única instancia local *single-tenant* (**KISS**).

## D-06: Dos Roles Fijos (`EMPLOYEE` vs. `HR`) y Gobernanza de Reservas
- **Contexto:** El cliente indica que 80 personas reservan y Recursos Humanos administra las salas. Sin límites operativos ocurren acaparamientos o cambios de último segundo.
- **Decisión:**
  - **Roles:** `EMPLOYEE` (crea reservas y mueve/cancela las propias) y `HR` (administra salas y mueve/cancela cualquier reserva).
  - **Autoservicio directo:** Sin flujo de aprobación; toda reserva válida pasa directo a `CONFIRMED`.
  - **Reglas de negocio:** Duración de **30 min a 4 horas**, anticipación máxima de **14 días**, horario laboral **07:00 a 20:00**, validación de aforo y **ventana de congelamiento (*freeze window*) de 30 minutos** antes del inicio para `EMPLOYEE` (con *override* administrativo para `HR`).
- **Por qué:** Evita el acaparamiento con reglas puras de dominio fáciles de verificar en TDD.

## D-07: Notificaciones Visuales en Pantalla (Sin SMTP / Correos)
- **Contexto:** Informar al organizador cuando RR. HH. reubica una reunión.
- **Decisión:** Propagar actualización vía WebSocket y marcar la reserva con `movedByHr: true` para mostrar un distintivo en la UI, omitiendo envío de correos.
- **Por qué:** Evita servidores SMTP o contenedores extra en Docker (**KISS**), dejando el puerto `NotificationPort` listo para conectar un adaptador de email en el futuro (**SOLID**).

## D-08: 80 Usuarios Precargados y Puerta Abierta a OAuth 2.0 / OIDC
- **Contexto:** En producción las identidades y roles provienen de un directorio corporativo mediante OAuth 2.0 / OIDC.
- **Decisión:** Omitir login con contraseñas y CRUD de usuarios; precargar los **80 usuarios** (3 `HR` y 77 `EMPLOYEE`) con `seed.ts` y resolver la identidad mediante `AuthMiddleware` (`x-user-id`).
- **Por qué:** Permite probar ambos roles y múltiples empleados en paralelo desde el primer segundo y deja listo el adaptador de entrada para cambiarlo por validación de JWT OAuth 2.0 sin tocar el dominio.

## D-09: Frontend Responsive Modular (Tipo Google Calendar)
- **Contexto:** Interfaz intuitiva para visualizar las 5 salas sin complejidad de Microfrontends.
- **Decisión:** SPA modular en React 19 con Tailwind CSS responsive (sin anchos fijos rígidos), pantalla inicial de selección de identidad (4 accesos rápidos + buscador de los 80 usuarios) y grilla horaria estilo Google Calendar con checkboxes por color de sala.
- **Por qué:** Evita la complejidad organizacional de Microfrontends (**KISS**) y ofrece una experiencia visual inmediata.

## D-10: Pirámide de Pruebas Unitarias con Vitest (Sin Playwright ni Integración)
- **Contexto:** Garantizar calidad con TDD en 2 horas y reconstrucción rápida en Docker.
- **Decisión:** Pruebas unitarias en **Vitest v5** para contratos compartidos, dominio/casos de uso (con repositorios *in-memory*) y componentes React (React Testing Library), descartando Playwright y suites pesadas de integración.
- **Por qué:** Evita descargar binarios pesados de Chromium en Docker y mantiene `npm test` veloz y determinístico.
