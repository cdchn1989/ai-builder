import type { WsEvent } from '@reservas/shared';
import type { Reservation, Room, User } from '../entities';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
}

export interface RoomRepository {
  findById(id: string): Promise<Room | null>;
  save(room: Room): Promise<void>;
}

export interface ReservationRepository {
  findById(id: string): Promise<Reservation | null>;
  /** Reservas CONFIRMED de la sala que cumplen `newStart < existingEnd && newEnd > existingStart`. */
  findOverlapping(roomId: string, start: Date, end: Date, excludeId?: string): Promise<Reservation[]>;
  /**
   * Inserta o actualiza. El adaptador DEBE garantizar atomicidad y lanzar `ConflictError`
   * si existe solape CONFIRMED (segunda barrera tras la validación del caso de uso).
   */
  save(reservation: Reservation): Promise<void>;
}

export interface NotificationPort {
  notifyDataInvalidated(entity: WsEvent['entity']): Promise<void> | void;
}

/** Dependencias transversales inyectables para tests deterministas. */
export interface Clock {
  now(): Date;
}
export interface IdGenerator {
  next(): string;
}
