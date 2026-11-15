import type {
  CreateReservationDTO,
  MoveReservationDTO,
  ReservationDTO,
  RoomDTO,
  UpdateRoomDTO,
  UserDTO,
} from '@reservas/shared';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';
export const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:3000/ws';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, opts: { userId?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.userId) headers['x-user-id'] = opts.userId;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `Error ${res.status}`);
  }
  return data as T;
}

export const api = {
  listUsers: () => request<UserDTO[]>('GET', '/users'),
  listRooms: () => request<RoomDTO[]>('GET', '/rooms'),
  listReservations: (date: string) => request<ReservationDTO[]>('GET', `/reservations?date=${date}`),
  createReservation: (userId: string, body: CreateReservationDTO) =>
    request<ReservationDTO>('POST', '/reservations', { userId, body }),
  moveReservation: (userId: string, id: string, body: MoveReservationDTO) =>
    request<ReservationDTO>('PATCH', `/reservations/${id}`, { userId, body }),
  cancelReservation: (userId: string, id: string) => request<ReservationDTO>('DELETE', `/reservations/${id}`, { userId }),
  updateRoom: (userId: string, id: string, body: UpdateRoomDTO) =>
    request<RoomDTO>('PATCH', `/rooms/${id}`, { userId, body }),
};

/** Mensaje legible para el usuario según el código HTTP del error. */
export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'La sala ya está reservada en ese horario. Elige otro horario o sala.';
    if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
    if (error.status === 422 || error.status === 400) return error.message;
    return error.message;
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
