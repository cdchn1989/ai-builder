import { UpdateRoomSchema, type RoomDTO, type UpdateRoomDTO } from '@reservas/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { api, describeApiError } from '../../shared/api/client';
import { currentUserAtom } from '../../shared/store/atoms';
import { Button, Card, ErrorAlert, fieldClass } from '../../shared/ui';

function RoomCard({ room }: { room: RoomDTO }) {
  const user = useAtomValue(currentUserAtom);
  const queryClient = useQueryClient();
  const [name, setName] = useState(room.name);
  const [capacity, setCapacity] = useState(String(room.capacity));
  const [equipment, setEquipment] = useState(room.equipment);
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (patch: UpdateRoomDTO) => api.updateRoom(user!.id, room.id, patch),
    onSuccess: () => {
      setError(null);
      return queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (e) => setError(describeApiError(e)),
  });

  const save = () => {
    const patch = { name: name.trim(), capacity: Number(capacity), equipment };
    if (!UpdateRoomSchema.safeParse(patch).success) {
      setError('Revisa los datos: nombre de 2 a 60 caracteres, capacidad de 2 a 50 y equipamiento de hasta 200.');
      return;
    }
    update.mutate(patch);
  };

  return (
    <Card className="flex flex-col gap-3">
      <div data-testid={`room-${room.id}`} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{room.name}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${room.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
            {room.isActive ? 'Activa' : 'Desactivada'}
          </span>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Capacidad
          <input className={fieldClass} type="number" min={2} max={50} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Equipamiento
          <input className={fieldClass} value={equipment} onChange={(e) => setEquipment(e.target.value)} />
        </label>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div className="flex gap-2">
          <Button onClick={save} disabled={update.isPending}>
            Guardar
          </Button>
          <Button variant={room.isActive ? 'danger' : 'secondary'} onClick={() => update.mutate({ isActive: !room.isActive })} disabled={update.isPending}>
            {room.isActive ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function RoomsAdminView() {
  const { data: rooms = [], isError } = useQuery({ queryKey: ['rooms'], queryFn: api.listRooms });
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold text-[#1E3A8A]">Administración de Salas</h2>
      {isError && <ErrorAlert>No se pudieron cargar las salas.</ErrorAlert>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
}
