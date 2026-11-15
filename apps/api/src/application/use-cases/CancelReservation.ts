import type { Reservation } from '../../domain/entities';
import { NotFoundError, ValidationError } from '../../domain/errors';
import { AuthorizationPolicy, type PolicyActor } from '../../domain/policies/AuthorizationPolicy';
import type { Clock, NotificationPort, ReservationRepository } from '../../domain/ports';

export class CancelReservation {
  constructor(
    private readonly reservations: ReservationRepository,
    private readonly notifier: NotificationPort,
    private readonly clock: Clock,
    private readonly policy = new AuthorizationPolicy(),
  ) {}

  async execute(actor: PolicyActor, reservationId: string): Promise<Reservation> {
    const current = await this.reservations.findById(reservationId);
    if (!current) throw new NotFoundError('Reserva no encontrada');
    if (current.status === 'CANCELLED') throw new ValidationError('La reserva ya está cancelada');

    this.policy.assertCanModifyReservation(actor, current, this.clock.now());

    const cancelled: Reservation = { ...current, status: 'CANCELLED' };
    await this.reservations.save(cancelled);
    await this.notifier.notifyDataInvalidated('reservations');
    return cancelled;
  }
}
