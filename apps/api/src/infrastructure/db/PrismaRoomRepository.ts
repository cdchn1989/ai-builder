import type { PrismaClient } from '@prisma/client';
import type { Room } from '../../domain/entities';
import { ConflictError } from '../../domain/errors';
import type { RoomRepository } from '../../domain/ports';
import { toRoom } from './mappers';

/** Código Prisma de violación de restricción única (p. ej. `Room.name`). */
const PRISMA_UNIQUE_VIOLATION = 'P2002';

export class PrismaRoomRepository implements RoomRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Room | null> {
    const row = await this.prisma.room.findUnique({ where: { id } });
    return row ? toRoom(row) : null;
  }

  async findAll(): Promise<Room[]> {
    return (await this.prisma.room.findMany()).map(toRoom);
  }

  async save(room: Room): Promise<void> {
    const { id, ...data } = room;
    try {
      await this.prisma.room.upsert({ where: { id }, update: data, create: room });
    } catch (err) {
      if ((err as { code?: string })?.code === PRISMA_UNIQUE_VIOLATION) {
        throw new ConflictError('Ya existe una sala con ese nombre');
      }
      throw err;
    }
  }
}
