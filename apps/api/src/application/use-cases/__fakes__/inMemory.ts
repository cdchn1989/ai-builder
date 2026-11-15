import { ConflictError } from '../../../domain/errors';
import type { Reservation, Room } from '../../../domain/entities';
import type {
  Clock,
  IdGenerator,
  NotificationPort,
  ReservationRepository,
  RoomRepository,
} from '../../../domain/ports';

export class InMemoryReservationRepository implements ReservationRepository {
  readonly items = new Map<string, Reservation>();

  async findById(id: string) {
    const r = this.items.get(id);
    return r ? { ...r } : null;
  }

  async findOverlapping(roomId: string, start: Date, end: Date, excludeId?: string) {
    return this.overlapping(roomId, start, end, excludeId);
  }

  private overlapping(roomId: string, start: Date, end: Date, excludeId?: string) {
    return [...this.items.values()].filter(
      (r) =>
        r.roomId === roomId &&
        r.status === 'CONFIRMED' &&
        r.id !== excludeId &&
        start < r.endTime &&
        end > r.startTime,
    );
  }

  async save(reservation: Reservation) {
    if (
      reservation.status === 'CONFIRMED' &&
      this.overlapping(reservation.roomId, reservation.startTime, reservation.endTime, reservation.id).length > 0
    ) {
      throw new ConflictError('La sala ya está reservada en ese horario');
    }
    this.items.set(reservation.id, { ...reservation });
  }
}

export class InMemoryRoomRepository implements RoomRepository {
  readonly items = new Map<string, Room>();
  async findById(id: string) {
    const r = this.items.get(id);
    return r ? { ...r } : null;
  }
  async save(room: Room) {
    this.items.set(room.id, { ...room });
  }
}

export class SpyNotification implements NotificationPort {
  readonly calls: string[] = [];
  notifyDataInvalidated(entity: 'reservations' | 'rooms') {
    this.calls.push(entity);
  }
}

export class FixedClock implements Clock {
  constructor(public current: Date) {}
  now() {
    return this.current;
  }
}

export class SeqIds implements IdGenerator {
  private n = 0;
  next() {
    return `res-${++this.n}`;
  }
}

/** Hora local de negocio (UTC-6) -> Date. Ej: local('2026-11-16', '09:30'). */
export function local(day: string, hhmm: string): Date {
  return new Date(`${day}T${hhmm}:00-06:00`);
}

/** "Hoy" de los tests: lunes 2026-11-16 10:00 hora local. */
export const NOW = local('2026-11-16', '10:00');
export const ROOM_ID = '11111111-1111-4111-8111-111111111111';
export const OTHER_ROOM_ID = '22222222-2222-4222-8222-222222222222';

export const employee = { id: 'emp-1', role: 'EMPLOYEE' as const };
export const otherEmployee = { id: 'emp-2', role: 'EMPLOYEE' as const };
export const hr = { id: 'hr-1', role: 'HR' as const };

export function makeRoom(over: Partial<Room> = {}): Room {
  return { id: ROOM_ID, name: 'Sala A', capacity: 10, equipment: 'TV', isActive: true, ...over };
}

export function makeReservation(over: Partial<Reservation> = {}): Reservation {
  return {
    id: 'seed-1',
    roomId: ROOM_ID,
    userId: employee.id,
    title: 'Reunión',
    startTime: local('2026-11-16', '14:00'),
    endTime: local('2026-11-16', '15:00'),
    attendeesCount: 4,
    status: 'CONFIRMED',
    movedByHr: false,
    ...over,
  };
}
