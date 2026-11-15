import type { ReservationStatus, Role } from '@reservas/shared';
import type { Reservation, Room, User } from '../../domain/entities';

// Filas mínimas esperadas de Prisma (estructurales: no se importan tipos generados).
interface UserRow { id: string; name: string; email: string; role: Role }
interface RoomRow { id: string; name: string; capacity: number; equipment: string; isActive: boolean }
interface ReservationRow {
  id: string; roomId: string; userId: string; title: string; startTime: Date; endTime: Date;
  attendeesCount: number; status: ReservationStatus; movedByHr: boolean;
}

export const toUser = (r: UserRow): User => ({ id: r.id, name: r.name, email: r.email, role: r.role });

export const toRoom = (r: RoomRow): Room => ({
  id: r.id, name: r.name, capacity: r.capacity, equipment: r.equipment, isActive: r.isActive,
});

export const toReservation = (r: ReservationRow): Reservation => ({
  id: r.id, roomId: r.roomId, userId: r.userId, title: r.title, startTime: r.startTime,
  endTime: r.endTime, attendeesCount: r.attendeesCount, status: r.status, movedByHr: r.movedByHr,
});
