import { describe, expect, it } from 'vitest';
import { addDays, canModifyReservation, formatMinutes, minutesOfDay, timeOptions, todayString, toIsoAt } from './time';
import { CARLOS, HR_USER, MARIA, reservation } from '../../test/testUtils';

describe('time helpers (día de negocio UTC-6)', () => {
  it('convierte fecha + minutos a ISO UTC', () => {
    expect(toIsoAt('2026-11-16', 420)).toBe('2026-11-16T13:00:00.000Z');
    expect(toIsoAt('2026-11-16', 20 * 60)).toBe('2026-11-17T02:00:00.000Z');
  });
  it('obtiene los minutos del día de negocio desde un ISO', () => {
    expect(minutesOfDay('2026-11-16T13:30:00.000Z')).toBe(450);
    expect(minutesOfDay('2026-11-17T02:00:00.000Z')).toBe(1200);
  });
  it('calcula la fecha de hoy en hora de negocio', () => {
    expect(todayString(new Date('2026-11-15T03:00:00Z'))).toBe('2026-11-14');
    expect(todayString(new Date('2026-11-15T07:00:00Z'))).toBe('2026-11-15');
  });
  it('suma días cruzando meses', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });
  it('formatea minutos y genera opciones de 07:00 a 20:00 cada 30 min', () => {
    expect(formatMinutes(450)).toBe('07:30');
    const opts = timeOptions();
    expect(opts).toHaveLength(27);
    expect(opts[0]).toBe(420);
    expect(opts.at(-1)).toBe(1200);
  });
});

describe('canModifyReservation', () => {
  const now = new Date('2026-11-16T15:00:00Z');
  it('HR puede siempre, incluso dentro de la ventana de 30 min', () => {
    expect(canModifyReservation(HR_USER, reservation({ startTime: '2026-11-16T15:10:00.000Z' }), now)).toBe(true);
  });
  it('EMPLOYEE puede la propia con >= 30 min de margen', () => {
    expect(canModifyReservation(CARLOS, reservation({ startTime: '2026-11-16T15:30:00.000Z' }), now)).toBe(true);
  });
  it('EMPLOYEE no puede la propia con < 30 min', () => {
    expect(canModifyReservation(CARLOS, reservation({ startTime: '2026-11-16T15:29:00.000Z' }), now)).toBe(false);
  });
  it('EMPLOYEE no puede una ajena', () => {
    expect(canModifyReservation(MARIA, reservation(), now)).toBe(false);
  });
});
