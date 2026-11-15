import type { ReservationDTO, UserDTO } from '@reservas/shared';

/** Offset del día de negocio respecto a UTC (misma convención que la API). */
export const BUSINESS_UTC_OFFSET_HOURS = -6;
export const FREEZE_WINDOW_MS = 30 * 60_000;
export const DAY_START = 7 * 60;
export const DAY_END = 20 * 60;
export const SLOT_MINUTES = 30;

const OFFSET_MS = BUSINESS_UTC_OFFSET_HOURS * 3_600_000;
const pad = (n: number) => String(n).padStart(2, '0');

const parseDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
};

const formatDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** ISO UTC del instante `minutes` (desde 00:00 de negocio) en `date` (YYYY-MM-DD). */
export const toIsoAt = (date: string, minutes: number) =>
  new Date(parseDate(date) + minutes * 60_000 - OFFSET_MS).toISOString();

/** Minutos desde 00:00 de negocio para un instante ISO. */
export const minutesOfDay = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

export const todayString = (now: Date = new Date()) => formatDate(now.getTime() + OFFSET_MS);

export const addDays = (date: string, days: number) => formatDate(parseDate(date) + days * 86_400_000);

export const formatMinutes = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Opciones de hora cada 30 min entre 07:00 y 20:00 (ambos incluidos). */
export const timeOptions = () => {
  const out: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += SLOT_MINUTES) out.push(m);
  return out;
};

/** EMPLOYEE: solo propias con >= 30 min de margen; HR: cualquiera. */
export const canModifyReservation = (user: UserDTO, reservation: ReservationDTO, now: Date = new Date()) => {
  if (user.role === 'HR') return true;
  if (reservation.userId !== user.id) return false;
  return new Date(reservation.startTime).getTime() - now.getTime() >= FREEZE_WINDOW_MS;
};
