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
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts           # Idempotente: 5 salas + 80 usuarios (3 HR, 77 EMPLOYEE)
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

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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

## 3. Contratos Compartidos (`packages/shared/src/index.ts`)
```typescript
import { z } from 'zod';

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

export type WsEvent = {
  type: 'DATA_INVALIDATED';
  entity: 'reservations' | 'rooms';
  timestamp: string;
};
```

## 4. Reglas de Negocio e Invariantes (Dominio)
1. **Horario Operativo:** Lunes a Viernes entre `07:00` y `20:00` (en punto o medias horas).
2. **Duración:** Mínimo `30 minutos`, máximo `240 minutos` (4 horas).
3. **Anticipación:** No se permiten fechas pasadas ni reservas a más de `14 días` desde el momento actual.
4. **Capacidad y Estado de Sala:** `room.isActive === true` y `attendeesCount <= room.capacity`.
5. **Cero Solapamientos (Doble Validación):**
   - Validación en caso de uso del dominio y ejecución atómica dentro de `prisma.$transaction(..., { isolationLevel: 'Serializable' })` en el adaptador de infraestructura. No puede existir otra reserva `CONFIRMED` en la misma `roomId` donde `newStart < existingEnd && newEnd > existingStart`. Si choca -> `409 Conflict`.
6. **Autorización y Freeze Window (30 min):**
   - Solo `HR` puede editar/activar/desactivar salas (`403 Forbidden` para `EMPLOYEE`).
   - Un `EMPLOYEE` solo puede mover o cancelar sus propias reservas (`403 Forbidden` si es ajena), y únicamente si faltan **30 minutos o más** para `startTime` (`422 Unprocessable Entity` si falta menos de 30 min).
   - `HR` puede mover o cancelar **cualquier** reserva sin restricción de los 30 minutos. Si `HR` mueve una reserva de otro empleado, `movedByHr` pasa a `true`.

## 5. Contratos API REST (`/api/v1`) y WebSocket (`/ws`)
- Cabecera de identidad en mutaciones: `x-user-id: <uuid>` (resuelta por `AuthMiddleware`).
- `GET /api/v1/health` -> `{ status: "ok" }`
- `GET /api/v1/users` -> Lista los 80 usuarios ordenados con `HR` primero.
- `GET /api/v1/rooms` -> Lista las 5 salas.
- `PATCH /api/v1/rooms/:id` -> Actualiza sala (Solo `HR`). Emite WS `entity: 'rooms'`.
- `GET /api/v1/reservations?date=YYYY-MM-DD` -> Reservas `CONFIRMED` del día.
- `POST /api/v1/reservations` -> Crea reserva (`201` o `409`). Emite WS `entity: 'reservations'`.
- `PATCH /api/v1/reservations/:id` -> Reubica/edita reserva (`200`, `403`, `409`, `422`). Emite WS `entity: 'reservations'`.
- `DELETE /api/v1/reservations/:id` -> Cancela reserva (`200`, `403`, `422`). Emite WS `entity: 'reservations'`.

## 6. Especificación de Pantallas, Roles y Diseño Responsive (`apps/web`)
- **Diseño Responsive:** Tailwind CSS *mobile-first* con contenedores flexibles (`flex-col lg:flex-row`) y anchos relativos (`w-full lg:w-64 xl:w-72`), sin anchos fijos rígidos.
- **Aislamiento por Pestaña:** `currentUserAtom` persistido en `sessionStorage` para abrir múltiples pestañas con distintos empleados simultáneamente.
- **Pantalla 0 (`UserGateModal` / Switcher en Header):** 4 accesos rápidos en 1 clic (`Ana Morales [HR]`, `Carlos Pérez [EMPLOYEE]`, `María López [EMPLOYEE]`, `Javier Reyes [EMPLOYEE]`) + buscador en tiempo real por nombre o correo de los 80 usuarios precargados.
- **Header Global:** Título, indicador en vivo WebSocket, pestañas condicionales (`Calendario` para todos; `Administración de Salas` solo si `role === 'HR'`) y badge con nombre/rol actual + botón *"Cambiar usuario"*.
- **Pantalla 1 (`CalendarView` tipo Google Calendar):** Sidebar izquierdo colapsable con botón **"+ Nueva Reserva"**, selector de fecha y checkboxes con color distintivo por sala (`visibleRoomIdsAtom`). Grilla horaria nativa (`07:00` a `20:00`, slots de 30 min) mostrando reservas filtradas por color, badge **"Reagendada por RR. HH."** si `movedByHr === true`, y botones **"Mover" / "Cancelar"** visibles según permisos (`EMPLOYEE` solo propias con `>= 30 min`; `HR` todas sin límite). Modal `ReservationModal` con manejo claro de errores `409` y `422`.
- **Pantalla 2 (`RoomsAdminView` - Solo `HR`):** Gestión de las 5 salas (editar nombre, capacidad, equipamiento y toggle `Activa / Desactivada`).
- **Sincronización WS (`useWebSocketSync`):** Escucha `VITE_WS_URL` e invalida automáticamente `['reservations']` o `['rooms']` en TanStack Query.
