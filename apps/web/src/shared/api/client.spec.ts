import { describe, expect, it } from 'vitest';
import { api, ApiError, describeApiError } from './client';
import { CARLOS, ROOMS, stubFetch } from '../../test/testUtils';

describe('cliente HTTP', () => {
  it('lista usuarios y salas desde /api/v1', async () => {
    const fetchMock = stubFetch((url) => (url.endsWith('/rooms') ? { body: ROOMS } : { body: [CARLOS] }));
    expect(await api.listUsers()).toEqual([CARLOS]);
    expect(await api.listRooms()).toEqual(ROOMS);
    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:3000/api/v1/users');
  });
  it('lista reservas con ?date=', async () => {
    const fetchMock = stubFetch(() => ({ body: [] }));
    await api.listReservations('2026-11-16');
    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:3000/api/v1/reservations?date=2026-11-16');
  });
  it('POST envía x-user-id y cuerpo JSON', async () => {
    const fetchMock = stubFetch(() => ({ status: 201, body: { id: 'x' } }));
    const dto = { roomId: 'r', title: 'Demo', startTime: 'a', endTime: 'b', attendeesCount: 2 };
    await api.createReservation('u-1', dto);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('u-1');
    expect(JSON.parse(init.body as string)).toEqual(dto);
  });
  it('usa PATCH para mover/editar sala y DELETE para cancelar', async () => {
    const fetchMock = stubFetch(() => ({ body: {} }));
    await api.moveReservation('u', 'r-1', { title: 'Nuevo' });
    await api.updateRoom('u', 'room-1', { isActive: false });
    await api.cancelReservation('u', 'r-1');
    expect(fetchMock.mock.calls.map((c) => [(c[1] as RequestInit).method, c[0]])).toEqual([
      ['PATCH', 'http://localhost:3000/api/v1/reservations/r-1'],
      ['PATCH', 'http://localhost:3000/api/v1/rooms/room-1'],
      ['DELETE', 'http://localhost:3000/api/v1/reservations/r-1'],
    ]);
  });
  it('lanza ApiError con status, code y mensaje del servidor', async () => {
    stubFetch(() => ({ status: 409, body: { error: { code: 'CONFLICT', message: 'Choque' } } }));
    const err = await api.cancelReservation('u', 'r').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'CONFLICT', message: 'Choque' });
  });
});

describe('describeApiError', () => {
  it('traduce los códigos de negocio a mensajes claros', () => {
    expect(describeApiError(new ApiError(409, 'CONFLICT', 'x'))).toMatch(/ya está reservada/i);
    expect(describeApiError(new ApiError(403, 'FORBIDDEN', 'x'))).toMatch(/permiso/i);
    expect(describeApiError(new ApiError(422, 'VALIDATION', 'Faltan menos de 30 minutos'))).toBe('Faltan menos de 30 minutos');
    expect(describeApiError(new Error('boom'))).toMatch(/error inesperado/i);
  });
});
