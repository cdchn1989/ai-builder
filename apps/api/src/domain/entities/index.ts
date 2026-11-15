import type { ReservationStatus, Role } from '@reservas/shared';

/** Entidades puras de dominio: sin tipos de Prisma/Express/ws. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  equipment: string;
  isActive: boolean;
}

export interface Reservation {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendeesCount: number;
  status: ReservationStatus;
  movedByHr: boolean;
}
