import type { Room } from '../entities';
import { ValidationError } from '../errors';

export const MIN_DURATION_MIN = 30;
export const MAX_DURATION_MIN = 240;
export const MAX_ADVANCE_DAYS = 14;
export const OPEN_HOUR_MIN = 7 * 60;
export const CLOSE_HOUR_MIN = 20 * 60;
/** Zona horaria operativa de la oficina (UTC-6). Inyectable para otras oficinas/tests. */
export const DEFAULT_UTC_OFFSET_MINUTES = -360;

const MIN_MS = 60_000;

/** Invariantes puras de la spec §4 (horario, duración, anticipación, sala y aforo). */
export class ReservationRules {
  constructor(private readonly utcOffsetMinutes = DEFAULT_UTC_OFFSET_MINUTES) {}

  private toLocal(d: Date): Date {
    return new Date(d.getTime() + this.utcOffsetMinutes * MIN_MS);
  }

  private minutesOfDay(d: Date): number {
    const l = this.toLocal(d);
    return l.getUTCHours() * 60 + l.getUTCMinutes();
  }

  assertValidSlot(start: Date, end: Date, now: Date): void {
    const durationMin = (end.getTime() - start.getTime()) / MIN_MS;
    if (durationMin < MIN_DURATION_MIN || durationMin > MAX_DURATION_MIN) {
      throw new ValidationError(`La duración debe estar entre ${MIN_DURATION_MIN} y ${MAX_DURATION_MIN} minutos`);
    }
    const aligned = [start, end].every((d) => {
      const l = this.toLocal(d);
      return l.getUTCMinutes() % 30 === 0 && l.getUTCSeconds() === 0 && l.getUTCMilliseconds() === 0;
    });
    if (!aligned) throw new ValidationError('Las reservas deben iniciar y terminar en punto o a y media');

    const startLocal = this.toLocal(start);
    const endLocal = this.toLocal(end);
    const weekday = startLocal.getUTCDay();
    const sameDay = startLocal.toISOString().slice(0, 10) === endLocal.toISOString().slice(0, 10);
    if (weekday === 0 || weekday === 6 || !sameDay) {
      throw new ValidationError('Solo se puede reservar de lunes a viernes dentro de un mismo día');
    }
    if (this.minutesOfDay(start) < OPEN_HOUR_MIN || this.minutesOfDay(end) > CLOSE_HOUR_MIN) {
      throw new ValidationError('El horario operativo es de 07:00 a 20:00');
    }

    if (start.getTime() < now.getTime()) throw new ValidationError('No se permiten reservas en el pasado');
    if (start.getTime() > now.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * MIN_MS) {
      throw new ValidationError(`No se permiten reservas a más de ${MAX_ADVANCE_DAYS} días`);
    }
  }

  assertRoomFits(room: Room, attendeesCount: number): void {
    if (!room.isActive) throw new ValidationError('La sala está desactivada');
    if (attendeesCount > room.capacity) {
      throw new ValidationError(`El aforo (${attendeesCount}) excede la capacidad de la sala (${room.capacity})`);
    }
  }
}
