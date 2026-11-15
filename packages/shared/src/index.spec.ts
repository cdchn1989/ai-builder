import { describe, expect, it } from 'vitest';
import {
  CreateReservationSchema,
  HealthResponseSchema,
  MoveReservationSchema,
  ReservationStatusSchema,
  RoleSchema,
  UpdateRoomSchema,
  WsEventSchema,
  type ReservationDTO,
  type RoomDTO,
  type UserDTO,
  type WsEvent,
} from './index';

const uuid = '3f2b8c1e-4d5a-4b6c-9d7e-1a2b3c4d5e6f';
const validCreate = {
  roomId: uuid,
  title: 'Daily de equipo',
  startTime: '2026-11-16T14:00:00.000Z',
  endTime: '2026-11-16T14:30:00.000Z',
  attendeesCount: 4,
};

describe('HealthResponseSchema', () => {
  it('acepta { status: "ok" }', () => {
    expect(HealthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  });
  it('rechaza otros estados', () => {
    expect(HealthResponseSchema.safeParse({ status: 'down' }).success).toBe(false);
  });
});

describe('RoleSchema y ReservationStatusSchema', () => {
  it('aceptan solo sus valores válidos', () => {
    expect(RoleSchema.safeParse('HR').success).toBe(true);
    expect(RoleSchema.safeParse('EMPLOYEE').success).toBe(true);
    expect(RoleSchema.safeParse('ADMIN').success).toBe(false);
    expect(ReservationStatusSchema.safeParse('CONFIRMED').success).toBe(true);
    expect(ReservationStatusSchema.safeParse('CANCELLED').success).toBe(true);
    expect(ReservationStatusSchema.safeParse('PENDING').success).toBe(false);
  });
});

describe('CreateReservationSchema', () => {
  it('acepta una reserva válida', () => {
    expect(CreateReservationSchema.parse(validCreate)).toEqual(validCreate);
  });
  it.each([
    ['roomId no uuid', { roomId: 'abc' }],
    ['title < 3 caracteres', { title: 'ab' }],
    ['title > 100 caracteres', { title: 'x'.repeat(101) }],
    ['startTime no ISO', { startTime: '2026-11-16 14:00' }],
    ['endTime no ISO', { endTime: 'mañana' }],
    ['attendeesCount 0', { attendeesCount: 0 }],
    ['attendeesCount decimal', { attendeesCount: 2.5 }],
    ['attendeesCount string', { attendeesCount: '3' }],
  ])('rechaza %s', (_n, override) => {
    expect(CreateReservationSchema.safeParse({ ...validCreate, ...override }).success).toBe(false);
  });
  it('acepta title en los límites 3 y 100', () => {
    expect(CreateReservationSchema.safeParse({ ...validCreate, title: 'abc' }).success).toBe(true);
    expect(CreateReservationSchema.safeParse({ ...validCreate, title: 'x'.repeat(100) }).success).toBe(true);
  });
  it('rechaza si falta un campo requerido', () => {
    const { roomId: _r, ...rest } = validCreate;
    expect(CreateReservationSchema.safeParse(rest).success).toBe(false);
  });
});

describe('MoveReservationSchema', () => {
  it('acepta objeto vacío (todos opcionales)', () => {
    expect(MoveReservationSchema.parse({})).toEqual({});
  });
  it('acepta cambios parciales válidos', () => {
    const input = { roomId: uuid, startTime: validCreate.startTime, title: 'Nuevo título' };
    expect(MoveReservationSchema.parse(input)).toEqual(input);
  });
  it.each([
    ['roomId no uuid', { roomId: 'x' }],
    ['startTime inválido', { startTime: 'x' }],
    ['endTime inválido', { endTime: '10:00' }],
    ['title corto', { title: 'a' }],
    ['title largo', { title: 'x'.repeat(101) }],
    ['attendeesCount 0', { attendeesCount: 0 }],
    ['attendeesCount decimal', { attendeesCount: 1.5 }],
  ])('rechaza %s', (_n, input) => {
    expect(MoveReservationSchema.safeParse(input).success).toBe(false);
  });
});

describe('UpdateRoomSchema', () => {
  it('acepta objeto vacío y parcial válido', () => {
    expect(UpdateRoomSchema.parse({})).toEqual({});
    const input = { name: 'Sala Norte', capacity: 10, equipment: 'TV, pizarra', isActive: false };
    expect(UpdateRoomSchema.parse(input)).toEqual(input);
  });
  it('respeta límites de capacity (2..50)', () => {
    expect(UpdateRoomSchema.safeParse({ capacity: 1 }).success).toBe(false);
    expect(UpdateRoomSchema.safeParse({ capacity: 2 }).success).toBe(true);
    expect(UpdateRoomSchema.safeParse({ capacity: 50 }).success).toBe(true);
    expect(UpdateRoomSchema.safeParse({ capacity: 51 }).success).toBe(false);
    expect(UpdateRoomSchema.safeParse({ capacity: 5.5 }).success).toBe(false);
  });
  it('respeta límites de name (2..60) y equipment (<=200)', () => {
    expect(UpdateRoomSchema.safeParse({ name: 'a' }).success).toBe(false);
    expect(UpdateRoomSchema.safeParse({ name: 'x'.repeat(61) }).success).toBe(false);
    expect(UpdateRoomSchema.safeParse({ name: 'x'.repeat(60) }).success).toBe(true);
    expect(UpdateRoomSchema.safeParse({ equipment: 'x'.repeat(201) }).success).toBe(false);
    expect(UpdateRoomSchema.safeParse({ equipment: 'x'.repeat(200) }).success).toBe(true);
  });
  it('rechaza isActive no booleano', () => {
    expect(UpdateRoomSchema.safeParse({ isActive: 'true' }).success).toBe(false);
  });
});

describe('WsEventSchema', () => {
  it('acepta DATA_INVALIDATED para reservations y rooms', () => {
    const base = { type: 'DATA_INVALIDATED', timestamp: '2026-11-14T22:00:00.000Z' };
    expect(WsEventSchema.safeParse({ ...base, entity: 'reservations' }).success).toBe(true);
    expect(WsEventSchema.safeParse({ ...base, entity: 'rooms' }).success).toBe(true);
  });
  it('rechaza tipo o entidad desconocidos y timestamp inválido', () => {
    const ok = { type: 'DATA_INVALIDATED', entity: 'rooms', timestamp: '2026-11-14T22:00:00.000Z' };
    expect(WsEventSchema.safeParse({ ...ok, type: 'OTHER' }).success).toBe(false);
    expect(WsEventSchema.safeParse({ ...ok, entity: 'users' }).success).toBe(false);
    expect(WsEventSchema.safeParse({ ...ok, timestamp: 'ayer' }).success).toBe(false);
  });
});

describe('tipos DTO (contrato)', () => {
  it('compilan con la forma esperada', () => {
    const user: UserDTO = { id: uuid, name: 'Ana Morales', email: 'ana@x.com', role: 'HR' };
    const room: RoomDTO = { id: uuid, name: 'Sala 1', capacity: 8, equipment: 'TV', isActive: true };
    const res: ReservationDTO = {
      id: uuid, roomId: uuid, userId: uuid, title: 'Demo',
      startTime: validCreate.startTime, endTime: validCreate.endTime,
      attendeesCount: 3, status: 'CONFIRMED', movedByHr: false,
    };
    const ev: WsEvent = { type: 'DATA_INVALIDATED', entity: 'rooms', timestamp: 'x' };
    expect([user.role, room.capacity, res.status, ev.type]).toHaveLength(4);
  });
});
