import type { RoomDTO } from '@reservas/shared';
import type { RoomRepository } from '../../domain/ports';

export class ListRooms {
  constructor(private readonly rooms: RoomRepository) {}

  async execute(): Promise<RoomDTO[]> {
    const all = await this.rooms.findAll();
    return all
      .map(({ id, name, capacity, equipment, isActive }): RoomDTO => ({ id, name, capacity, equipment, isActive }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
