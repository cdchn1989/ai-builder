import type { PrismaClient } from '@prisma/client';
import type { Room } from '../../domain/entities';
import type { RoomRepository } from '../../domain/ports';
import { toRoom } from './mappers';

export class PrismaRoomRepository implements RoomRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Room | null> {
    const row = await this.prisma.room.findUnique({ where: { id } });
    return row ? toRoom(row) : null;
  }

  async save(room: Room): Promise<void> {
    const { id, ...data } = room;
    await this.prisma.room.upsert({ where: { id }, update: data, create: room });
  }
}
