import { CreateReservationSchema, type ReservationDTO, type RoomDTO } from '@reservas/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useState, type FormEvent } from 'react';
import { api, describeApiError } from '../../shared/api/client';
import { formatMinutes, minutesOfDay, timeOptions, toIsoAt } from '../../shared/lib/time';
import { currentUserAtom } from '../../shared/store/atoms';
import { Button, ErrorAlert, fieldClass } from '../../shared/ui';

type Props = {
  rooms: RoomDTO[];
  date: string;
  onClose: () => void;
} & ({ mode: 'create'; reservation?: undefined } | { mode: 'edit'; reservation: ReservationDTO });

const OPTIONS = timeOptions();

export function ReservationModal({ mode, reservation, rooms, date, onClose }: Props) {
  const user = useAtomValue(currentUserAtom);
  const queryClient = useQueryClient();

  const selectable = rooms.filter((r) => r.isActive || r.id === reservation?.roomId);
  const [roomId, setRoomId] = useState(reservation?.roomId ?? selectable[0]?.id ?? '');
  const [title, setTitle] = useState(reservation?.title ?? '');
  const [start, setStart] = useState(reservation ? minutesOfDay(reservation.startTime) : 9 * 60);
  const [end, setEnd] = useState(reservation ? minutesOfDay(reservation.endTime) || 20 * 60 : 10 * 60);
  const [attendees, setAttendees] = useState(String(reservation?.attendeesCount ?? 1));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: ReturnType<typeof buildBody>) =>
      mode === 'create' ? api.createReservation(user!.id, body) : api.moveReservation(user!.id, reservation!.id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reservations'] });
      onClose();
    },
    onError: (e) => setError(describeApiError(e)),
  });

  function buildBody() {
    return {
      roomId,
      title: title.trim(),
      startTime: toIsoAt(date, start),
      endTime: toIsoAt(date, end),
      attendeesCount: Number(attendees),
    };
  }

  function validate(): string | null {
    const t = title.trim();
    if (t.length < 3 || t.length > 100) return 'El título debe tener entre 3 y 100 caracteres.';
    const n = Number(attendees);
    if (!Number.isInteger(n) || n < 1) return 'Indica al menos 1 asistente.';
    const room = rooms.find((r) => r.id === roomId);
    if (room && n > room.capacity) return `La sala admite máximo ${room.capacity} personas.`;
    if (end <= start) return 'La hora de fin debe ser posterior a la de inicio.';
    if (!CreateReservationSchema.safeParse(buildBody()).success) return 'Revisa los datos de la reserva.';
    return null;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (!problem && user) mutation.mutate(buildBody());
  }

  const heading = mode === 'create' ? 'Nueva reserva' : 'Mover reserva';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="res-title"
        onSubmit={submit}
        className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 id="res-title" className="text-lg font-semibold text-[#1E3A8A]">
            {heading}
          </h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded px-2 text-xl text-slate-500 hover:bg-slate-100">
            ×
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Sala
          <select className={fieldClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {selectable.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (cap. {r.capacity})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Título
          <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Inicio
            <select className={fieldClass} value={start} onChange={(e) => setStart(Number(e.target.value))}>
              {OPTIONS.slice(0, -1).map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Fin
            <select className={fieldClass} value={end} onChange={(e) => setEnd(Number(e.target.value))}>
              {OPTIONS.slice(1).map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Asistentes
          <input className={fieldClass} type="number" min={1} value={attendees} onChange={(e) => setAttendees(e.target.value)} />
        </label>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <Button type="submit" disabled={mutation.isPending}>
          {mode === 'create' ? 'Reservar' : 'Guardar cambios'}
        </Button>
      </form>
    </div>
  );
}
