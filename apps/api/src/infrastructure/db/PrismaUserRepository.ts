import type { PrismaClient } from '@prisma/client';
import type { User } from '../../domain/entities';
import type { UserRepository } from '../../domain/ports';
import { toUser } from './mappers';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }
}
