import type { Role } from '@reservas/shared';
import { ForbiddenError, ValidationError } from '../errors';

export const FREEZE_WINDOW_MINUTES = 30;

/** Datos mínimos que la política necesita del actor (desacoplado de entidades/ORM). */
export interface PolicyActor {
  id: string;
  role: Role;
}

/** Datos mínimos que la política necesita de la reserva. */
export interface PolicyReservation {
  userId: string;
  startTime: Date;
}

export class AuthorizationPolicy {
  /** Solo HR administra salas (403 para EMPLOYEE). */
  assertCanManageRooms(actor: PolicyActor): void {
    if (actor.role !== 'HR') {
      throw new ForbiddenError('Solo RR. HH. puede administrar salas');
    }
  }

  /**
   * Mover/cancelar: HR sin restricciones; EMPLOYEE solo las propias (403)
   * y con >= 30 min de antelación (422).
   */
  assertCanModifyReservation(actor: PolicyActor, reservation: PolicyReservation, now: Date): void {
    if (actor.role === 'HR') return;
    if (reservation.userId !== actor.id) {
      throw new ForbiddenError('Solo puedes modificar tus propias reservas');
    }
    const minutesToStart = (reservation.startTime.getTime() - now.getTime()) / 60_000;
    if (minutesToStart < FREEZE_WINDOW_MINUTES) {
      throw new ValidationError(
        `No se puede modificar con menos de ${FREEZE_WINDOW_MINUTES} minutos de antelación`,
      );
    }
  }

  /** `movedByHr` es true solo cuando HR actúa sobre la reserva de otro usuario. */
  isMovedByHr(actor: PolicyActor, reservation: PolicyReservation): boolean {
    return actor.role === 'HR' && reservation.userId !== actor.id;
  }
}
