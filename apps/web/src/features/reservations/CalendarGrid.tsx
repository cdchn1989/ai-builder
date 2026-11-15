import type { ReservationDTO, RoomDTO, UserDTO } from '@reservas/shared';
import { Button } from '../../shared/ui';
import { canModifyReservation, DAY_END, DAY_START, formatMinutes, minutesOfDay, SLOT_MINUTES } from '../../shared/lib/time';
import { roomColor } from './roomColors';

const SLOT_REM = 2.5;
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
            <div key={room.id} className="min-w-[11rem] flex-1 border-r border-slate-200 last:border-r-0">
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
                    return (
                      <article
                        key={r.id}
                        style={{ top: `${top}rem`, height: `${height}rem` }}
                        className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 p-1.5 text-xs shadow-sm ${color.bg} ${color.border}`}
                      >
                        <p className="truncate font-semibold">{r.title}</p>
                        <p className="truncate text-slate-600">
                          {formatMinutes(minutesOfDay(r.startTime))}–{formatMinutes(minutesOfDay(r.endTime) || DAY_END)} · {r.userName ?? ''}
                        </p>
                        {r.movedByHr && (
                          <span className="mt-0.5 inline-block rounded bg-amber-200 px-1 text-[0.7rem] font-medium text-amber-900">
                            Reagendada por RR. HH.
                          </span>
                        )}
                        {editable && (
                          <div className="mt-1 flex gap-1">
                            <Button variant="secondary" className="!px-2 !py-0.5 text-xs" onClick={() => onMove(r)}>
                              Mover
                            </Button>
                            <Button variant="danger" className="!px-2 !py-0.5 text-xs" onClick={() => onCancel(r)}>
                              Cancelar
                            </Button>
                          </div>
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
