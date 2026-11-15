import type { UserDTO } from '@reservas/shared';
import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { todayString } from '../lib/time';

const sessionJson = <T,>() =>
  createJSONStorage<T>(() => sessionStorage);

/** Usuario activo, aislado por pestaña (sessionStorage). */
export const currentUserAtom = atomWithStorage<UserDTO | null>('currentUser', null, sessionJson<UserDTO | null>(), {
  getOnInit: true,
});

export const selectedDateAtom = atom<string>(todayString());

/** `null` = todas las salas visibles. */
export const visibleRoomIdsAtom = atom<string[] | null>(null);

export type TabId = 'calendar' | 'rooms';
export const activeTabAtom = atom<TabId>('calendar');
