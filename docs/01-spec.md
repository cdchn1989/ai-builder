# 01 · Especificación Técnica y Funcional del MVP

## 1. Estructura Exacta del Monorepo
```text
/
├── docker-compose.yml            # Servicios: db (postgres:16-alpine + volumen), api, web
├── package.json                  # Workspaces: packages/shared, apps/api, apps/web
├── tsconfig.base.json            # strict: true
├── packages/
│   └── shared/
│       └── src/
│           ├── index.ts          # Modelos, DTOs, Schemas Zod y WsEvent
│           └── index.spec.ts     # Tests unitarios de esquemas Zod
├── apps/
│   ├── api/
│   │   ├── Dockerfile            # node:24-alpine + openssl
│   │   ├── prisma.config.ts      # Prisma 7: URL de BD, ruta de migraciones y comando de seed
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/       # Migración inicial versionada (migrate deploy en Docker)
│   │   │   └── seed.ts           # Idempotente: 5 salas (ids fijos) + 80 usuarios (3 HR, 77 EMPLOYEE)
│   │   └── src/
│   │       ├── domain/
│   │       │   ├── entities/     # User, Room, Reservation (agnósticos a Prisma)
│   │       │   ├── errors/       # DomainError, ConflictError, ForbiddenError, ValidationError
│   │       │   ├── policies/     # AuthorizationPolicy.ts (+ .spec.ts)
│   │       │   └── ports/        # UserRepository, RoomRepository, ReservationRepository, NotificationPort
│   │       ├── application/
│   │       │   └── use-cases/    # CreateReservation, MoveReservation, CancelReservation, ManageRoom (+ .spec.ts)
│   │       ├── infrastructure/
│   │       │   ├── db/           # PrismaUserRepository, PrismaRoomRepository, PrismaReservationRepository
│   │       │   ├── http/         # Express app, routes, AuthMiddleware (x-user-id), errorHandler (+ .spec.ts)
│   │       │   └── ws/           # WsNotificationAdapter (+ .spec.ts)
│   │       └── main.ts
│   └── web/
│       ├── Dockerfile            # node:24-alpine
│       └── src/
│           ├── features/
│           │   ├── auth-switcher/  # UserGateModal y Header Switcher (4 accesos + buscador 80 usuarios)
│           │   ├── reservations/   # CalendarView (RoomFilterSidebar + CalendarGrid) y ReservationModal
│           │   └── rooms/          # RoomsAdminView (exclusiva para HR)
│           ├── shared/
│           │   ├── api/            # Cliente HTTP + hook useWebSocketSync
│           │   ├── store/          # Átomos Jotai (currentUserAtom en sessionStorage, selectedDateAtom, visibleRoomIdsAtom, activeTabAtom)
│           │   └── ui/             # Componentes base Tailwind responsive
│           └── App.tsx
```

## 2. Esquema Literal de Base de Datos (`apps/api/prisma/schema.prisma`)
*Nota arquitectónica:* Este esquema pertenece exclusivamente a la capa de infraestructura. Los adaptadores Prisma mapean estos registros a entidades puras de `src/domain/entities` para mantener independencia de motor de base de datos.

> **Trampa de Prisma 7 (ver D-11):** Prisma 7 **rechaza** `url = env("DATABASE_URL")` dentro del `datasource` y **exige un driver adapter**. Por eso:
> - El `datasource` solo declara `provider`; la URL, la ruta de migraciones y el comando de seed viven en `apps/api/prisma.config.ts`.
> - Dependencias extra en `apps/api`: `@prisma/adapter-pg@^7.10.1`, `pg@^8` (y `@types/pg`), `tsx` para ejecutar TypeScript.
> - El cliente se crea en `infrastructure/db/createPrismaClient.ts` con `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`.
> - El `Dockerfile` de `api` ejecuta `npx prisma generate` en el build.
>
> ```ts
> // apps/api/prisma.config.ts
> import { defineConfig } from 'prisma/config';
> export default defineConfig({
>   schema: 'prisma/schema.prisma',
>   migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
>   datasource: { url: process.env.DATABASE_URL ?? 'postgresql://reservas:reservas@localhost:5432/reservas' },
> });
> ```

```prisma
generator client {
  provider = "prisma-client-js"
}

// Prisma 7: la URL de conexión vive en prisma.config.ts (no en el schema).
datasource db {
  provider = "postgresql"
}

enum Role {
  EMPLOYEE
  HR
}

enum ReservationStatus {
  CONFIRMED
  CANCELLED
}

model User {
  id           String        @id @default(uuid())
  name         String
  email        String        @unique
  role         Role          @default(EMPLOYEE)
  reservations Reservation[]
  createdAt    DateTime      @default(now())
}

model Room {
  id           String        @id @default(uuid())
  name         String        @unique
  capacity     Int
  equipment    String
  isActive     Boolean       @default(true)
  reservations Reservation[]
  createdAt    DateTime      @default(now())
}

model Reservation {
  id             String            @id @default(uuid())
  roomId         String
  room           Room              @relation(fields: [roomId], references: [id])
  userId         String
  user           User              @relation(fields: [userId], references: [id])
  title          String
  startTime      DateTime
  endTime        DateTime
  attendeesCount Int
  status         ReservationStatus @default(CONFIRMED)
  movedByHr      Boolean           @default(false)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  @@index([roomId, startTime, endTime])
}
```

### Datos semilla (`prisma/seed.ts` → `infrastructure/db/seedData.ts` + `runSeed.ts`)
- **Salas (5), con `id` UUID fijo** para que el seed no dependa del nombre (HR puede renombrarlas):

| id | name | capacity | equipment |
|---|---|---|---|
| `0b6f3c1e-5a2d-4e8b-9c41-1a0000000001` | Sala Andes | 6 | TV 55", pizarra |
| `0b6f3c1e-5a2d-4e8b-9c41-1a0000000002` | Sala Pacífico | 10 | Proyector, videoconferencia |
| `0b6f3c1e-5a2d-4e8b-9c41-1a0000000003` | Sala Amazonas | 4 | Pantalla, pizarra |
| `0b6f3c1e-5a2d-4e8b-9c41-1a0000000004` | Sala Caribe | 14 | Proyector, sistema de audio, videoconferencia |
| `0b6f3c1e-5a2d-4e8b-9c41-1a0000000005` | Sala Patagonia | 20 | Proyector, micrófonos, videoconferencia |

- **Usuarios (80), emails `@empresa.com` únicos y deterministas:** HR = Ana Morales, Luis Herrera, Sofía Castillo; EMPLOYEE fijos = Carlos Pérez, María López, Javier Reyes; los 74 restantes se generan combinando nombres y apellidos (`nombre.apellido@empresa.com`, sin tildes).
- **Idempotencia (ver D-12):** `room.createMany({ data, skipDuplicates: true })` y `user.createMany({ data, skipDuplicates: true })` (Postgres `ON CONFLICT DO NOTHING`). Nunca pisa ediciones de HR ni duplica salas renombradas. La lógica vive en `runSeed(prisma)` (testeable con un doble); `prisma/seed.ts` solo la invoca.

## 3. Contratos Compartidos (`packages/shared/src/index.ts`)
```typescript
import { z } from 'zod';

export const HealthResponseSchema = z.object({ status: z.literal('ok') });
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const RoleSchema = z.enum(['EMPLOYEE', 'HR']);
export type Role = z.infer<typeof RoleSchema>;

export const ReservationStatusSchema = z.enum(['CONFIRMED', 'CANCELLED']);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface RoomDTO {
  id: string;
  name: string;
  capacity: number;
  equipment: string;
  isActive: boolean;
}

export interface ReservationDTO {
  id: string;
  roomId: string;
  userId: string;
  userName?: string;
  roomName?: string;
  title: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  status: ReservationStatus;
  movedByHr: boolean;
}

export const CreateReservationSchema = z.object({
  roomId: z.string().uuid(),
  title: z.string().min(3).max(100),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  attendeesCount: z.number().int().min(1),
});
export type CreateReservationDTO = z.infer<typeof CreateReservationSchema>;

export const MoveReservationSchema = z.object({
  roomId: z.string().uuid().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  title: z.string().min(3).max(100).optional(),
  attendeesCount: z.number().int().min(1).optional(),
});
export type MoveReservationDTO = z.infer<typeof MoveReservationSchema>;

export const UpdateRoomSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  capacity: z.number().int().min(2).max(50).optional(),
  equipment: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateRoomDTO = z.infer<typeof UpdateRoomSchema>;

// El cliente valida cada mensaje WS con este esquema y descarta los inválidos.
export const WsEventSchema = z.object({
  type: z.literal('DATA_INVALIDATED'),
  entity: z.enum(['reservations', 'rooms']),
  timestamp: z.string().datetime(),
});
export type WsEvent = z.infer<typeof WsEventSchema>;
```

*Empaquetado:* `packages/shared/package.json` expone `"main"` y `"types"` apuntando a `src/index.ts` (los consumidores lo importan como `@reservas/shared` vía workspaces, sin build previo); `tsconfig.build.json` permite además compilarlo a `dist/` (`npm run build -w @reservas/shared`).

## 4. Reglas de Negocio e Invariantes (Dominio)
0. **Zona horaria de negocio (ver D-13):** Todas las reglas de calendario se evalúan en **UTC-6 fijo** (sin horario de verano), tanto en la API (`ReservationRules`, `ListReservations`) como en la web (`shared/lib/time.ts`), de modo que el resultado no depende de la zona del servidor ni del navegador. Las fechas viajan siempre como ISO 8601 UTC.
1. **Horario Operativo:** Lunes a Viernes entre `07:00` y `20:00` (en punto o medias horas), inicio y fin dentro del mismo día.
2. **Duración:** Mínimo `30 minutos`, máximo `240 minutos` (4 horas).
3. **Anticipación:** No se permiten fechas pasadas ni reservas a más de `14 días` desde el momento actual.
4. **Capacidad y Estado de Sala:** `room.isActive === true` y `attendeesCount <= room.capacity`.
5. **Cero Solapamientos (Doble Validación):**
   - Validación en caso de uso del dominio y ejecución atómica dentro de `prisma.$transaction(..., { isolationLevel: 'Serializable' })` en el adaptador de infraestructura. No puede existir otra reserva `CONFIRMED` en la misma `roomId` donde `newStart < existingEnd && newEnd > existingStart`. Si choca -> `409 Conflict`.
6. **Autorización y Freeze Window (30 min):**
   - Solo `HR` puede editar/activar/desactivar salas (`403 Forbidden` para `EMPLOYEE`).
   - Un `EMPLOYEE` solo puede mover o cancelar sus propias reservas (`403 Forbidden` si es ajena), y únicamente si faltan **30 minutos o más** para `startTime` (`422 Unprocessable Entity` si falta menos de 30 min).
   - `HR` puede mover o cancelar **cualquier** reserva sin restricción de los 30 minutos. Si `HR` mueve una reserva de otro empleado, `movedByHr` pasa a `true`.
7. **Mover y cancelar:** Una reserva `CANCELLED` no se puede mover ni volver a cancelar (`422`). Al mover se re-validan aforo y sala activa siempre, y horario/duración/anticipación solo si cambian `startTime` o `endTime`. Cancelar es un cambio lógico a `status: 'CANCELLED'` (no se borra la fila).
8. **Puertos auxiliares:** Los casos de uso reciben `Clock` (`now()`) e `IdGenerator` (`next()`) por constructor para tests deterministas.

## 5. Contratos API REST (`/api/v1`) y WebSocket (`/ws`)
- Cabecera de identidad en mutaciones: `x-user-id: <uuid>` (resuelta por `AuthMiddleware`). Si falta o el usuario no existe → `401`.
- **Formato de error único:** `{ "error": { "code": string, "message": string, "details"?: [{ path, message }] } }`.
- **Mapeo de errores (`errorHandler`):** `ZodError` o JSON malformado → `400 BAD_REQUEST`; falta/desconocido `x-user-id` → `401 UNAUTHORIZED`; `ForbiddenError` → `403`; `NotFoundError` (o ruta inexistente) → `404`; `ConflictError` → `409`; `ValidationError` → `422`; resto → `500`. Prisma `P2034` (fallo de serialización) y `P2002` (nombre de sala duplicado) se traducen a `ConflictError` (`409`) en los adaptadores.
- `GET /api/v1/health` -> `{ status: "ok" }`
- `GET /api/v1/users` -> Lista los 80 usuarios ordenados con `HR` primero.
- `GET /api/v1/rooms` -> Lista las 5 salas.
- `PATCH /api/v1/rooms/:id` -> Actualiza sala (Solo `HR`). Emite WS `entity: 'rooms'`.
- `GET /api/v1/reservations?date=YYYY-MM-DD` -> Reservas `CONFIRMED` cuyo inicio cae en ese día (UTC-6), ordenadas por `startTime`, con `userName` y `roomName` rellenados. `date` ausente o inválida → `400`.
- `POST /api/v1/reservations` -> Crea reserva (`201` o `409`). Emite WS `entity: 'reservations'`.
- `PATCH /api/v1/reservations/:id` -> Reubica/edita reserva (`200`, `403`, `409`, `422`). Emite WS `entity: 'reservations'`.
- `DELETE /api/v1/reservations/:id` -> Cancela reserva (`200` con la `ReservationDTO` en `CANCELLED`, `403`, `422`). Emite WS `entity: 'reservations'`.
- **WebSocket:** `WsNotificationAdapter` (implementa `NotificationPort`) se adjunta al mismo `http.Server` de Express en `/ws` y hace *broadcast* en memoria de un `WsEvent` a cada cliente abierto tras cada mutación exitosa.

## 6. Especificación de Pantallas, Roles y Diseño Responsive (`apps/web`)
- **Diseño Responsive:** Tailwind CSS *mobile-first* con contenedores flexibles (`flex-col lg:flex-row`) y anchos relativos (`w-full lg:w-64 xl:w-72`), sin anchos fijos rígidos.
- **Aislamiento por Pestaña:** `currentUserAtom` persistido en `sessionStorage` para abrir múltiples pestañas con distintos empleados simultáneamente.
- **Pantalla 0 (`UserGateModal` / Switcher en Header):** 4 accesos rápidos en 1 clic (`Ana Morales [HR]`, `Carlos Pérez [EMPLOYEE]`, `María López [EMPLOYEE]`, `Javier Reyes [EMPLOYEE]`) + buscador en tiempo real por nombre o correo de los 80 usuarios precargados.
- **Header Global:** Título, indicador en vivo WebSocket, pestañas condicionales (`Calendario` para todos; `Administración de Salas` solo si `role === 'HR'`) y badge con nombre/rol actual + botón *"Cambiar usuario"*.
- **Pantalla 1 (`CalendarView` tipo Google Calendar):** Sidebar izquierdo colapsable con botón **"+ Nueva Reserva"**, selector de fecha y checkboxes con color distintivo por sala (`visibleRoomIdsAtom`). Grilla horaria nativa (`07:00` a `20:00`, slots de 30 min) mostrando reservas filtradas por color, badge **"Reagendada por RR. HH."** si `movedByHr === true`, y botones **"Mover" / "Cancelar"** visibles según permisos (`EMPLOYEE` solo propias con `>= 30 min`; `HR` todas sin límite). Modal `ReservationModal` con manejo claro de errores `409` y `422`.
- **Acciones de reserva (ver D-16):** "Mover" y "Cancelar" viven en un menú **⋮** (`ActionMenu`: botón de tres puntos + overlay `role="menu"` con posición `fixed`, cierre con Escape, clic fuera, scroll y resize) en la fila superior del bloque, para que no se recorten en reservas de 30 min. Franja de `3.5rem` por slot de 30 min y columnas con `min-w-[14rem]` (scroll horizontal en móvil). Bloques de 30 min muestran un badge compacto «HR» (con `aria-label`/`title` "Reagendada por RR. HH."). Cancelar no usa diálogos nativos (`confirm`); los errores se muestran en un aviso.
- **Colores por sala:** paleta fija por índice (azul, esmeralda, ámbar, rosa, violeta) compartida por checkbox y bloque. Las salas desactivadas no aparecen en el calendario ni al crear; al mover, la sala actual se conserva en el selector.
- **Pantalla 2 (`RoomsAdminView` - Solo `HR`):** Gestión de las 5 salas (editar nombre, capacidad, equipamiento y toggle `Activa / Desactivada`).
- **Sincronización WS (`useWebSocketSync`):** Escucha `VITE_WS_URL` e invalida automáticamente `['reservations']` o `['rooms']` en TanStack Query; devuelve `connected` para el indicador del Header y reconecta cada 2 s si se cae.
- **Permisos en UI:** `canModifyReservation(user, reservation, now)` replica la regla del dominio solo como UX; la API sigue siendo la autoridad.

## 7. Notas de Implementación y Trampas Conocidas
- **Ejecución de TypeScript en `api`:** sin paso de build; `npm start` = `tsx src/main.ts` (y `tsx prisma/seed.ts` para el seed).
- **Docker:** contexto de build = raíz del monorepo (`npm ci` con el `package-lock.json` raíz). `web` corre `vite --host 0.0.0.0 --port 5173`; las `VITE_*` se pasan como `environment` en `docker-compose.yml`. `.dockerignore` excluye `node_modules`, `dist`, `.git` y `docs`.
- **Vitest:** `apps/api` → `environment: 'node'`, `include: ['src/**/*.spec.ts']`. `apps/web` → configurado en `vite.config.ts` con `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, `unstubGlobals: true`. Solo `@testing-library/react` (`fireEvent`), sin `user-event` ni `jest-dom`; `fetch` y `WebSocket` se sustituyen con dobles.
- **Rehidratación de `currentUserAtom`:** usar `atomWithStorage(..., createJSONStorage(() => sessionStorage), { getOnInit: true })`; en tests, simular la recarga con `vi.resetModules`.
- **Dobles de Prisma:** los adaptadores se prueban contra un `fakePrisma.ts` mínimo en `infrastructure/db` (sin BD real, sin tests de integración).
