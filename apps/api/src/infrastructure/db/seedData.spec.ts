import { describe, expect, it } from 'vitest';
import { ROOMS_SEED, USERS_SEED } from './seedData';

describe('seedData', () => {
  it('define 5 salas con nombres únicos', () => {
    expect(ROOMS_SEED).toHaveLength(5);
    expect(new Set(ROOMS_SEED.map((r) => r.name)).size).toBe(5);
    for (const r of ROOMS_SEED) {
      expect(r.capacity).toBeGreaterThanOrEqual(2);
      expect(r.capacity).toBeLessThanOrEqual(50);
    }
  });

  it('cada sala tiene un id UUID fijo y único (el seed no depende del nombre)', () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    for (const r of ROOMS_SEED) expect(r.id).toMatch(uuid);
    expect(new Set(ROOMS_SEED.map((r) => r.id)).size).toBe(5);
  });

  it('define 80 usuarios: 3 HR y 77 EMPLOYEE con emails únicos', () => {
    expect(USERS_SEED).toHaveLength(80);
    expect(USERS_SEED.filter((u) => u.role === 'HR')).toHaveLength(3);
    expect(USERS_SEED.filter((u) => u.role === 'EMPLOYEE')).toHaveLength(77);
    expect(new Set(USERS_SEED.map((u) => u.email)).size).toBe(80);
  });

  it('incluye los 4 accesos rápidos de la spec con su rol', () => {
    const by = (n: string) => USERS_SEED.find((u) => u.name === n);
    expect(by('Ana Morales')?.role).toBe('HR');
    expect(by('Carlos Pérez')?.role).toBe('EMPLOYEE');
    expect(by('María López')?.role).toBe('EMPLOYEE');
    expect(by('Javier Reyes')?.role).toBe('EMPLOYEE');
  });
});
