import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import type { ReservationDTO, RoomDTO, UserDTO } from '@reservas/shared';
import { currentUserAtom } from '../shared/store/atoms';

export const HR_USER: UserDTO = { id: 'u-hr', name: 'Ana Morales', email: 'ana.morales@empresa.com', role: 'HR' };
export const CARLOS: UserDTO = { id: 'u-carlos', name: 'Carlos Pérez', email: 'carlos.perez@empresa.com', role: 'EMPLOYEE' };
export const MARIA: UserDTO = { id: 'u-maria', name: 'María López', email: 'maria.lopez@empresa.com', role: 'EMPLOYEE' };
export const JAVIER: UserDTO = { id: 'u-javier', name: 'Javier Reyes', email: 'javier.reyes@empresa.com', role: 'EMPLOYEE' };
export const LUCIA: UserDTO = { id: 'u-lucia', name: 'Lucía Fernández', email: 'lucia.fernandez@empresa.com', role: 'EMPLOYEE' };
export const USERS = [HR_USER, CARLOS, MARIA, JAVIER, LUCIA];

export const ROOM_A: RoomDTO = { id: '11111111-1111-4111-8111-111111111111', name: 'Sala Andes', capacity: 8, equipment: 'TV', isActive: true };
export const ROOM_B: RoomDTO = { id: '22222222-2222-4222-8222-222222222222', name: 'Sala Boreal', capacity: 4, equipment: 'Pizarra', isActive: true };
export const ROOM_C: RoomDTO = { id: '33333333-3333-4333-8333-333333333333', name: 'Sala Cima', capacity: 10, equipment: 'Proyector', isActive: false };
export const ROOMS = [ROOM_A, ROOM_B, ROOM_C];

export const reservation = (over: Partial<ReservationDTO> = {}): ReservationDTO => ({
  id: 'r-1',
  roomId: ROOM_A.id,
  userId: CARLOS.id,
  userName: CARLOS.name,
  roomName: ROOM_A.name,
  title: 'Planeación semanal',
  startTime: '2026-11-16T16:00:00.000Z', // 10:00 en UTC-6
  endTime: '2026-11-16T17:00:00.000Z',
  attendeesCount: 4,
  status: 'CONFIRMED',
  movedByHr: false,
  ...over,
});

type Reply = { status?: number; body?: unknown };
export type Handler = (url: string, init: RequestInit) => Reply | undefined;

/** Sustituye fetch por un doble que responde según `handler` (por defecto 404). */
export function stubFetch(handler: Handler) {
  const fn = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const reply = handler(String(input), init) ?? { status: 404, body: { error: { code: 'NOT_FOUND', message: 'no stub' } } };
    const status = reply.status ?? 200;
    return new Response(JSON.stringify(reply.body ?? {}), { status, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export function renderWithProviders(ui: ReactElement, opts: { user?: UserDTO | null } = {}) {
  const store = createStore();
  if (opts.user) store.set(currentUserAtom, opts.user);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const utils = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </Provider>,
  );
  return { ...utils, store, queryClient };
}
