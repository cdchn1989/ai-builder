import type { UpdateRoomDTO } from '@reservas/shared';
import type { Room } from '../../domain/entities';
import { NotFoundError } from '../../domain/errors';
import { AuthorizationPolicy, type PolicyActor } from '../../domain/policies/AuthorizationPolicy';
import type { NotificationPort, RoomRepository } from '../../domain/ports';

export class ManageRoom {
  constructor(
    private readonly rooms: RoomRepository,
    private readonly notifier: NotificationPort,
    private readonly policy = new AuthorizationPolicy(),
  ) {}

  async execute(actor: PolicyActor, roomId: string, patch: UpdateRoomDTO): Promise<Room> {
    this.policy.assertCanManageRooms(actor);
    const current = await this.rooms.findById(roomId);
    if (!current) throw new NotFoundError('Sala no encontrada');

    const updated: Room = {
      ...current,
      name: patch.name ?? current.name,
      capacity: patch.capacity ?? current.capacity,
      equipment: patch.equipment ?? current.equipment,
      isActive: patch.isActive ?? current.isActive,
    };
    await this.rooms.save(updated);
    await this.notifier.notifyDataInvalidated('rooms');
    return updated;
  }
}
