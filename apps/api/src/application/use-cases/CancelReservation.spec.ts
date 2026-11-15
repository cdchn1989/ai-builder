import { beforeEach, describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors';
import { CancelReservation } from './CancelReservation';
import {
  FixedClock, InMemoryReservationRepository, NOW, SpyNotification,
  employee, hr, local, makeReservation, otherEmployee,
} from './__fakes__/inMemory';

describe('CancelReservation', () => {
  let reservations: InMemoryReservationRepository;
  let notifier: SpyNotification;
  let clock: FixedClock;
  let useCase: CancelReservation;

  beforeEach(async () => {
    reservations = new InMemoryReservationRepository();
    notifier = new SpyNotification();
    clock = new FixedClock(NOW);
    await reservations.save(makeReservation());
    useCase = new CancelReservation(reservations, notifier, clock);
  });

  it('el dueño cancela: status CANCELLED y notifica', async () => {
    const r = await useCase.execute(employee, 'seed-1');
    expect(r.status).toBe('CANCELLED');
    expect(reservations.items.get('seed-1')!.status).toBe('CANCELLED');
    expect(notifier.calls).toEqual(['reservations']);
  });

  it('inexistente -> NotFoundError', async () => {
    await expect(useCase.execute(employee, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('ajena para EMPLOYEE -> ForbiddenError', async () => {
    await expect(useCase.execute(otherEmployee, 'seed-1')).rejects.toBeInstanceOf(ForbiddenError);
    expect(notifier.calls).toEqual([]);
  });

  it('freeze window para EMPLOYEE -> ValidationError', async () => {
    clock.current = local('2026-11-16', '13:45');
    await expect(useCase.execute(employee, 'seed-1')).rejects.toBeInstanceOf(ValidationError);
  });

  it('HR cancela cualquier reserva aunque ya haya empezado; movedByHr no cambia', async () => {
    clock.current = local('2026-11-16', '14:30');
    const r = await useCase.execute(hr, 'seed-1');
    expect(r.status).toBe('CANCELLED');
    expect(r.movedByHr).toBe(false);
  });

  it('ya cancelada -> ValidationError sin notificar', async () => {
    await useCase.execute(employee, 'seed-1');
    notifier.calls.length = 0;
    await expect(useCase.execute(employee, 'seed-1')).rejects.toBeInstanceOf(ValidationError);
    expect(notifier.calls).toEqual([]);
  });
});
