import type { RoomDTO } from '@reservas/shared';
import { useState } from 'react';
import { Button, fieldClass } from '../../shared/ui';
import { roomColor } from './roomColors';

interface Props {
  rooms: RoomDTO[];
  visibleIds: string[];
  date: string;
  onToggleRoom: (id: string) => void;
  onDateChange: (date: string) => void;
  onNewReservation: () => void;
}

export function RoomFilterSidebar({ rooms, visibleIds, date, onToggleRoom, onDateChange, onNewReservation }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="flex w-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:w-64 xl:w-72">
      <Button variant="secondary" onClick={() => setCollapsed((c) => !c)}>
        {collapsed ? 'Mostrar panel' : 'Ocultar panel'}
      </Button>
      {!collapsed && (
        <>
          <Button onClick={onNewReservation}>+ Nueva Reserva</Button>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Fecha
            <input type="date" value={date} onChange={(e) => e.target.value && onDateChange(e.target.value)} className={fieldClass} />
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Salas</legend>
            {rooms.map((room, i) => (
              <label key={room.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={visibleIds.includes(room.id)} onChange={() => onToggleRoom(room.id)} />
                <span aria-hidden className={`h-3 w-3 rounded-full ${roomColor(i).dot}`} />
                {room.name}
              </label>
            ))}
          </fieldset>
        </>
      )}
    </aside>
  );
}
