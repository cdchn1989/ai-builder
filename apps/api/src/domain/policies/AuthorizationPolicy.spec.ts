import { describe, expect, it } from 'vitest';
import { ForbiddenError, ValidationError } from '../errors';
import {
  AuthorizationPolicy,
  FREEZE_WINDOW_MINUTES,
  type PolicyActor,
  type PolicyReservation,
} from './AuthorizationPolicy';

const NOW = new Date('2026-11-16T10:00:00.000Z');
const minutesFromNow = (m: number) => new Date(NOW.getTime() + m * 60_000);

const hr: PolicyActor = { id: 'hr-1', role: 'HR' };
const ana: PolicyActor = { id: 'u-1', role: 'EMPLOYEE' };
const carlos: PolicyActor = { id: 'u-2', role: 'EMPLOYEE' };
const reservationOf = (userId: string, startsInMin: number): PolicyReservation => ({
  userId,
  startTime: minutesFromNow(startsInMin),
});

const policy = new AuthorizationPolicy();

describe('AuthorizationPolicy · salas', () => {
  it('HR puede administrar salas', () => {
    expect(() => policy.assertCanManageRooms(hr)).not.toThrow();
  });
  it('EMPLOYEE no puede administrar salas (403)', () => {
    expect(() => policy.assertCanManageRooms(ana)).toThrow(ForbiddenError);
  });
});

describe('AuthorizationPolicy · reservas propias vs ajenas', () => {
  it('EMPLOYEE puede mover/cancelar su propia reserva con holgura', () => {
    expect(() => policy.assertCanModifyReservation(ana, reservationOf('u-1', 120), NOW)).not.toThrow();
  });
  it('EMPLOYEE no puede tocar la reserva de otro (403)', () => {
    expect(() => policy.assertCanModifyReservation(ana, reservationOf('u-2', 120), NOW)).toThrow(ForbiddenError);
  });
  it('la propiedad se verifica antes que la freeze window (ajena + cercana => 403)', () => {
    expect(() => policy.assertCanModifyReservation(ana, reservationOf('u-2', 5), NOW)).toThrow(ForbiddenError);
  });
});

describe('AuthorizationPolicy · freeze window de 30 min', () => {
  it('la ventana es de 30 minutos', () => {
    expect(FREEZE_WINDOW_MINUTES).toBe(30);
  });
  it('EMPLOYEE puede modificar si faltan exactamente 30 min', () => {
    expect(() => policy.assertCanModifyReservation(ana, reservationOf('u-1', 30), NOW)).not.toThrow();
  });
  it('EMPLOYEE no puede modificar si faltan 29 min (422)', () => {
    expect(() => policy.assertCanModifyReservation(ana, reservationOf('u-1', 29), NOW)).toThrow(ValidationError);
  });
  it('EMPLOYEE no puede modificar una reserva ya iniciada (422)', () => {
    expect(() => policy.assertCanModifyReservation(ana, reservationOf('u-1', -10), NOW)).toThrow(ValidationError);
  });
});

describe('AuthorizationPolicy · override de HR', () => {
  it('HR puede modificar cualquier reserva dentro de la freeze window', () => {
    expect(() => policy.assertCanModifyReservation(hr, reservationOf('u-2', 5), NOW)).not.toThrow();
  });
  it('HR puede modificar una reserva ya iniciada', () => {
    expect(() => policy.assertCanModifyReservation(hr, reservationOf('u-2', -10), NOW)).not.toThrow();
  });
});

describe('AuthorizationPolicy · movedByHr', () => {
  it('es true cuando HR mueve la reserva de otro usuario', () => {
    expect(policy.isMovedByHr(hr, reservationOf('u-2', 120))).toBe(true);
  });
  it('es false cuando HR mueve su propia reserva', () => {
    expect(policy.isMovedByHr(hr, reservationOf('hr-1', 120))).toBe(false);
  });
  it('es false cuando un EMPLOYEE mueve la suya', () => {
    expect(policy.isMovedByHr(carlos, reservationOf('u-2', 120))).toBe(false);
  });
});
