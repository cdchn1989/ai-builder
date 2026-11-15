import type { PrismaClient } from '@prisma/client';
import { ConflictError } from '../../domain/errors';
import type { Reservation } from '../../domain/entities';
import type { ReservationRepository } from '../../domain/ports';
import { toReservation } from './mappers';

/** Código Prisma de fallo de escritura/serialización en transacciones. */
const PRISMA_TX_CONFLICT = 'P2034';

type Db = Pick<PrismaClient, 'reservation'>;

export class PrismaReservationRepository implements ReservationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Reservation | null> {
    const row = await this.prisma.reservation.findUnique({ where: { id } });
    return row ? toReservation(row) : null;
  }

  async findConfirmedBetween(from: Date, to: Date): Promise<Reservation[]> {
    const rows = await this.prisma.reservation.findMany({
      where: { status: 'CONFIRMED', startTime: { gte: from, lt: to } },
    });
    return rows.map(toReservation);
  }

  findOverlapping(roomId: string, start: Date, end: Date, excludeId?: string): Promise<Reservation[]> {
    return this.queryOverlapping(this.prisma, roomId, start, end, excludeId);
  }

  async save(reservation: Reservation): Promise<void> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          if (reservation.status === 'CONFIRMED') {
            const clashes = await this.queryOverlapping(
              tx, reservation.roomId, reservation.startTime, reservation.endTime, reservation.id,
            );
            if (clashes.length > 0) throw new ConflictError('La sala ya está reservada en ese horario');
          }
          const { id, ...data } = reservation;
          await tx.reservation.upsert({ where: { id }, update: data, create: reservation });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (err) {
      if ((err as { code?: string })?.code === PRISMA_TX_CONFLICT) {
        throw new ConflictError('Conflicto de concurrencia al reservar; reintenta');
      }
      throw err;
    }
  }

  private async queryOverlapping(db: Db, roomId: string, start: Date, end: Date, excludeId?: string) {
    const rows = await db.reservation.findMany({
      where: {
        roomId,
        status: 'CONFIRMED',
        startTime: { lt: end },
        endTime: { gt: start },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return rows.map(toReservation);
  }
}
