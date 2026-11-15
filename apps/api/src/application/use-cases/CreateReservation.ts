import type { CreateReservationDTO } from '@reservas/shared';
import type { Reservation } from '../../domain/entities';
import { ConflictError, NotFoundError } from '../../domain/errors';
import type { PolicyActor } from '../../domain/policies/AuthorizationPolicy';
import { ReservationRules } from '../../domain/policies/ReservationRules';
import type { Clock, IdGenerator, NotificationPort, ReservationRepository, RoomRepository } from '../../domain/ports';

export class CreateReservation {
  constructor(
    private readonly reservations: ReservationRepository,
    private readonly rooms: RoomRepository,
    private readonly notifier: NotificationPort,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly rules = new ReservationRules(),
  ) {}

  async execute(actor: PolicyActor, input: CreateReservationDTO): Promise<Reservation> {
    const room = await this.rooms.findById(input.roomId);
    if (!room) throw new NotFoundError('Sala no encontrada');

    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);
    this.rules.assertValidSlot(startTime, endTime, this.clock.now());
    this.rules.assertRoomFits(room, input.attendeesCount);

    if ((await this.reservations.findOverlapping(room.id, startTime, endTime)).length > 0) {
      throw new ConflictError('La sala ya está reservada en ese horario');
    }

    const reservation: Reservation = {
      id: this.ids.next(),
      roomId: room.id,
      userId: actor.id,
      title: input.title,
      startTime,
      endTime,
      attendeesCount: input.attendeesCount,
      status: 'CONFIRMED',
      movedByHr: false,
    };
    await this.reservations.save(reservation); // el adaptador re-valida atómicamente
    await this.notifier.notifyDataInvalidated('reservations');
    return reservation;
  }
}
