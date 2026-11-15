import type { ReservationDTO, RoomDTO, UserDTO } from '@reservas/shared';
import { ActionMenu } from './ActionMenu';
import { canModifyReservation, DAY_END, DAY_START, formatMinutes, minutesOfDay, SLOT_MINUTES } from '../../shared/lib/time';
import { roomColor } from './roomColors';

const SLOT_REM = 3.5;
/** Bloques de esta duración o menos usan un layout compacto de una sola línea. */
const COMPACT_MAX_MINUTES = SLOT_MINUTES;
const slots = Array.from({ length: (DAY_END - DAY_START) / SLOT_MINUTES }, (_, i) => DAY_START + i * SLOT_MINUTES);

interface Props {
  date: string;
  rooms: RoomDTO[];
  /** Índice de color estable por sala (posición en la lista completa de salas). */
  colorIndex?: Record<string, number>;
  reservations: ReservationDTO[];
  currentUser: UserDTO;
  now?: Date;
  onMove: (reservation: ReservationDTO) => void;
  onCancel: (reservation: ReservationDTO) => void;
}

export function CalendarGrid({ rooms, colorIndex, reservations, currentUser, now = new Date(), onMove, onCancel }: Props) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="flex min-w-max">
        <div className="w-14 shrink-0 border-r border-slate-200">
          <div className="h-10 border-b border-slate-200" />
          {slots.map((m) => (
            <div key={m} style={{ height: `${SLOT_REM}rem` }} className="border-b border-slate-100 pr-1 text-right text-xs text-slate-500">
              {formatMinutes(m)}
            </div>
          ))}
        </div>

        {rooms.map((room, i) => {
          const color = roomColor(colorIndex?.[room.id] ?? i);
          return (
            <div key={room.id} className="min-w-[14rem] flex-1 border-r border-slate-200 last:border-r-0">
              <div className="flex h-10 items-center justify-center border-b border-slate-200 text-sm font-semibold text-[#1E3A8A]">
                {room.name}
              </div>
              <div data-testid={`col-${room.id}`} className="relative" style={{ height: `${slots.length * SLOT_REM}rem` }}>
                {slots.map((m) => (
                  <div key={m} style={{ height: `${SLOT_REM}rem` }} className="border-b border-slate-100" />
                ))}
                {reservations
                  .filter((r) => r.roomId === room.id)
                  .map((r) => {
                    const start = Math.max(minutesOfDay(r.startTime), DAY_START);
                    const end = Math.min(minutesOfDay(r.endTime) || DAY_END, DAY_END);
                    const top = ((start - DAY_START) / SLOT_MINUTES) * SLOT_REM;
                    const height = Math.max(((end - start) / SLOT_MINUTES) * SLOT_REM, SLOT_REM);
                    const editable = canModifyReservation(currentUser, r, now);
                    const timeLabel = `${formatMinutes(minutesOfDay(r.startTime))}–${formatMinutes(minutesOfDay(r.endTime) || DAY_END)}`;
                    const compact = end - start <= COMPACT_MAX_MINUTES;
                    return (
                      <article
                        key={r.id}
                        title={`${r.title} · ${timeLabel} · ${r.userName ?? ''}`}
                        style={{ top: `${top}rem`, height: `${height}rem` }}
                        className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-xs shadow-sm ${color.bg} ${color.border}`}
                      >
                        <div className="flex h-6 items-center justify-between gap-1">
                          <p className="min-w-0 flex-1 truncate font-semibold">{r.title}</p>
                          {r.movedByHr && compact && (
                            <span
                              aria-label="Reagendada por RR. HH."
                              title="Reagendada por RR. HH."
                              className="shrink-0 rounded bg-amber-200 px-1 text-[0.65rem] font-semibold text-amber-900"
                            >
                              HR
                            </span>
                          )}
                          {editable && (
                            <ActionMenu label={`Acciones de ${r.title}`} onMove={() => onMove(r)} onCancel={() => onCancel(r)} />
                          )}
                        </div>
                        <div className={`flex gap-1 text-slate-600 ${compact ? 'items-baseline' : 'flex-col'}`}>
                          <span className="shrink-0 font-medium">{timeLabel}</span>
                          <span className={compact ? 'min-w-0 truncate' : 'break-words'}>{r.userName ?? ''}</span>
                        </div>
                        {r.movedByHr && !compact && (
                          <span className="mt-1 inline-block rounded bg-amber-200 px-1 text-[0.7rem] font-medium text-amber-900">
                            Reagendada por RR. HH.
                          </span>
                        )}
                      </article>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
