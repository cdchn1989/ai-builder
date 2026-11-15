import { beforeEach, describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../domain/errors';
import { ManageRoom } from './ManageRoom';
import { InMemoryRoomRepository, ROOM_ID, SpyNotification, employee, hr, makeRoom } from './__fakes__/inMemory';

describe('ManageRoom', () => {
  let rooms: InMemoryRoomRepository;
  let notifier: SpyNotification;
  let useCase: ManageRoom;

  beforeEach(async () => {
    rooms = new InMemoryRoomRepository();
    notifier = new SpyNotification();
    await rooms.save(makeRoom());
    useCase = new ManageRoom(rooms, notifier);
  });

  it('HR actualiza nombre, capacidad y equipamiento y notifica rooms', async () => {
    const r = await useCase.execute(hr, ROOM_ID, { name: 'Sala Azul', capacity: 12, equipment: 'Proyector' });
    expect(r).toMatchObject({ name: 'Sala Azul', capacity: 12, equipment: 'Proyector', isActive: true });
    expect(rooms.items.get(ROOM_ID)!.name).toBe('Sala Azul');
    expect(notifier.calls).toEqual(['rooms']);
  });

  it('HR desactiva y reactiva la sala', async () => {
    expect((await useCase.execute(hr, ROOM_ID, { isActive: false })).isActive).toBe(false);
    expect((await useCase.execute(hr, ROOM_ID, { isActive: true })).isActive).toBe(true);
  });

  it('un patch parcial conserva el resto de campos', async () => {
    const r = await useCase.execute(hr, ROOM_ID, { capacity: 6 });
    expect(r).toMatchObject({ name: 'Sala A', equipment: 'TV', capacity: 6 });
  });

  it('EMPLOYEE -> ForbiddenError y no modifica ni notifica', async () => {
    await expect(useCase.execute(employee, ROOM_ID, { isActive: false })).rejects.toBeInstanceOf(ForbiddenError);
    expect(rooms.items.get(ROOM_ID)!.isActive).toBe(true);
    expect(notifier.calls).toEqual([]);
  });

  it('sala inexistente -> NotFoundError', async () => {
    await expect(useCase.execute(hr, 'nope', { isActive: false })).rejects.toBeInstanceOf(NotFoundError);
  });
});
