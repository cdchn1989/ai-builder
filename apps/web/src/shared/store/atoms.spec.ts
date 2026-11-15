import { createStore } from 'jotai';
import { describe, expect, it, vi } from 'vitest';
import { activeTabAtom, currentUserAtom, selectedDateAtom, visibleRoomIdsAtom } from './atoms';
import { CARLOS } from '../../test/testUtils';

describe('átomos Jotai', () => {
  it('currentUserAtom arranca vacío', () => {
    expect(createStore().get(currentUserAtom)).toBeNull();
  });
  it('currentUserAtom persiste en sessionStorage y se rehidrata al recargar la pestaña', async () => {
    createStore().set(currentUserAtom, CARLOS);
    expect(JSON.parse(sessionStorage.getItem('currentUser')!)).toEqual(CARLOS);
    vi.resetModules(); // simula recarga: el módulo vuelve a leer sessionStorage
    const reloaded = await import('./atoms');
    expect(createStore().get(reloaded.currentUserAtom)).toEqual(CARLOS);
  });
  it('limpiar el usuario deja el estado vacío', () => {
    const store = createStore();
    store.set(currentUserAtom, CARLOS);
    store.set(currentUserAtom, null);
    expect(store.get(currentUserAtom)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('currentUser') ?? 'null')).toBeNull();
  });
  it('valores por defecto de fecha, salas visibles y pestaña', () => {
    const store = createStore();
    expect(store.get(selectedDateAtom)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(store.get(visibleRoomIdsAtom)).toBeNull();
    expect(store.get(activeTabAtom)).toBe('calendar');
  });
});
