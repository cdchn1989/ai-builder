import type { ReservationDTO } from '@reservas/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';
import { api, describeApiError } from '../../shared/api/client';
import { currentUserAtom, selectedDateAtom, visibleRoomIdsAtom } from '../../shared/store/atoms';
import { ErrorAlert } from '../../shared/ui';
import { CalendarGrid } from './CalendarGrid';
import { ReservationModal } from './ReservationModal';
import { RoomFilterSidebar } from './RoomFilterSidebar';

type ModalState = { mode: 'create' } | { mode: 'edit'; reservation: ReservationDTO } | null;

export function CalendarView() {
  const user = useAtomValue(currentUserAtom);
  const [date, setDate] = useAtom(selectedDateAtom);
  const [visibleIds, setVisibleIds] = useAtom(visibleRoomIdsAtom);
  const [modal, setModal] = useState<ModalState>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const rooms = useQuery({ queryKey: ['rooms'], queryFn: api.listRooms });
  const reservations = useQuery({ queryKey: ['reservations', date], queryFn: () => api.listReservations(date) });

  const cancel = useMutation({
    mutationFn: (r: ReservationDTO) => api.cancelReservation(user!.id, r.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
    onError: (e) => setActionError(describeApiError(e)),
  });

  if (!user) return null;

  const allRooms = rooms.data ?? [];
  const activeRooms = allRooms.filter((r) => r.isActive);
  const shownIds = visibleIds ?? activeRooms.map((r) => r.id);
  const colorIndex = Object.fromEntries(allRooms.map((r, i) => [r.id, i]));

  const toggleRoom = (id: string) =>
    setVisibleIds(shownIds.includes(id) ? shownIds.filter((x) => x !== id) : [...shownIds, id]);

  return (
    <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start">
      <RoomFilterSidebar
        rooms={activeRooms}
        visibleIds={shownIds}
        date={date}
        onToggleRoom={toggleRoom}
        onDateChange={setDate}
        onNewReservation={() => {
          setActionError(null);
          setModal({ mode: 'create' });
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {(rooms.isError || reservations.isError) && <ErrorAlert>No se pudieron cargar los datos del calendario.</ErrorAlert>}
        {actionError && <ErrorAlert>{actionError}</ErrorAlert>}
        <CalendarGrid
          date={date}
          rooms={activeRooms.filter((r) => shownIds.includes(r.id))}
          colorIndex={colorIndex}
          reservations={reservations.data ?? []}
          currentUser={user}
          onMove={(reservation) => {
            setActionError(null);
            setModal({ mode: 'edit', reservation });
          }}
          onCancel={(reservation) => {
            setActionError(null);
            cancel.mutate(reservation);
          }}
        />
      </div>

      {modal?.mode === 'create' && <ReservationModal mode="create" rooms={allRooms} date={date} onClose={() => setModal(null)} />}
      {modal?.mode === 'edit' && (
        <ReservationModal mode="edit" reservation={modal.reservation} rooms={allRooms} date={date} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
