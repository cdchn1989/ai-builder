import type { MoveReservationDTO } from '@reservas/shared';
import type { Reservation } from '../../domain/entities';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors';
import { AuthorizationPolicy, type PolicyActor } from '../../domain/policies/AuthorizationPolicy';
import { ReservationRules } from '../../domain/policies/ReservationRules';
import type { Clock, NotificationPort, ReservationRepository, RoomRepository } from '../../domain/ports';

export class MoveReservation {
  constructor(
    private readonly reservations: ReservationRepository,
    private readonly rooms: RoomRepository,
    private readonly notifier: NotificationPort,
    private readonly clock: Clock,
    private readonly policy = new AuthorizationPolicy(),
    private readonly rules = new ReservationRules(),
  ) {}

  async execute(actor: PolicyActor, reservationId: string, patch: MoveReservationDTO): Promise<Reservation> {
    const current = await this.reservations.findById(reservationId);
    if (!current) throw new NotFoundError('Reserva no encontrada');
    if (current.status === 'CANCELLED') throw new ValidationError('La reserva está cancelada');

    const now = this.clock.now();
    this.policy.assertCanModifyReservation(actor, current, now);

    const updated: Reservation = {
      ...current,
      roomId: patch.roomId ?? current.roomId,
      title: patch.title ?? current.title,
      attendeesCount: patch.attendeesCount ?? current.attendeesCount,
      startTime: patch.startTime ? new Date(patch.startTime) : current.startTime,
      endTime: patch.endTime ? new Date(patch.endTime) : current.endTime,
      movedByHr: current.movedByHr || this.policy.isMovedByHr(actor, current),
    };

    const room = await this.rooms.findById(updated.roomId);
    if (!room) throw new NotFoundError('Sala no encontrada');
    this.rules.assertRoomFits(room, updated.attendeesCount);

    if (patch.startTime || patch.endTime) {
      this.rules.assertValidSlot(updated.startTime, updated.endTime, now);
    }

    const clashes = await this.reservations.findOverlapping(room.id, updated.startTime, updated.endTime, updated.id);
    if (clashes.length > 0) throw new ConflictError('La sala ya está reservada en ese horario');

    await this.reservations.save(updated);
    await this.notifier.notifyDataInvalidated('reservations');
    return updated;
  }
}
