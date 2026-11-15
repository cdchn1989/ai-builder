import type { ReservationDTO } from '@reservas/shared';
import type { Reservation } from '../../domain/entities';
import { ValidationError } from '../../domain/errors';
import type { ReservationRepository, RoomRepository, UserRepository } from '../../domain/ports';

/** Zona horaria de negocio fija (single-tenant): UTC-6. */
export const BUSINESS_UTC_OFFSET = '-06:00';
const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` real (rechaza 2026-02-31, que JS normalizaría). */
export function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const probe = new Date(Date.UTC(y!, m! - 1, d!));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m! - 1 && probe.getUTCDate() === d;
}

export function toReservationDTO(r: Reservation, userName?: string, roomName?: string): ReservationDTO {
  return {
    id: r.id, roomId: r.roomId, userId: r.userId, userName, roomName, title: r.title,
    startTime: r.startTime.toISOString(), endTime: r.endTime.toISOString(),
    attendeesCount: r.attendeesCount, status: r.status, movedByHr: r.movedByHr,
  };
}

export class ListReservations {
  constructor(
    private readonly reservations: ReservationRepository,
    private readonly rooms: RoomRepository,
    private readonly users: UserRepository,
  ) {}

  /** Reservas CONFIRMED del día `YYYY-MM-DD` (hora local de negocio), ordenadas por inicio. */
  async execute(date: string): Promise<ReservationDTO[]> {
    const from = new Date(`${date}T00:00:00${BUSINESS_UTC_OFFSET}`);
    if (!isValidDateString(date)) throw new ValidationError('La fecha debe tener formato YYYY-MM-DD válido');
    const to = new Date(from.getTime() + DAY_MS);

    const [items, rooms, users] = await Promise.all([
      this.reservations.findConfirmedBetween(from, to),
      this.rooms.findAll(),
      this.users.findAll(),
    ]);
    const roomNames = new Map(rooms.map((r) => [r.id, r.name]));
    const userNames = new Map(users.map((u) => [u.id, u.name]));
    return items
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .map((r) => toReservationDTO(r, userNames.get(r.userId), roomNames.get(r.roomId)));
  }
}
