import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReservationModal } from './ReservationModal';
import { CARLOS, renderWithProviders, reservation, ROOM_A, ROOM_B, ROOM_C, stubFetch } from '../../test/testUtils';

const rooms = [ROOM_A, ROOM_B, ROOM_C];

const fill = (over: { title?: string; attendees?: string; start?: string; end?: string; room?: string } = {}) => {
  if (over.room) fireEvent.change(screen.getByLabelText('Sala'), { target: { value: over.room } });
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: over.title ?? 'Sprint planning' } });
  if (over.start) fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: over.start } });
  if (over.end) fireEvent.change(screen.getByLabelText('Fin'), { target: { value: over.end } });
  fireEvent.change(screen.getByLabelText('Asistentes'), { target: { value: over.attendees ?? '3' } });
};

describe('ReservationModal (crear)', () => {
  it('solo ofrece salas activas', () => {
    renderWithProviders(<ReservationModal mode="create" rooms={rooms} date="2026-11-16" onClose={vi.fn()} />, { user: CARLOS });
    const options = Array.from((screen.getByLabelText('Sala') as HTMLSelectElement).options).map((o) => o.text);
    expect(options.join()).toMatch(/Sala Andes/);
    expect(options.join()).not.toMatch(/Sala Cima/);
  });

  it('envía POST con DTO válido y cierra al tener éxito', async () => {
    const fetchMock = stubFetch(() => ({ status: 201, body: reservation() }));
    const onClose = vi.fn();
    renderWithProviders(<ReservationModal mode="create" rooms={rooms} date="2026-11-16" onClose={onClose} />, { user: CARLOS });
    fill({ title: 'Sprint planning', start: '600', end: '660', attendees: '3', room: ROOM_B.id });
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/v1/reservations');
    expect((init.headers as Record<string, string>)['x-user-id']).toBe(CARLOS.id);
    expect(JSON.parse(init.body as string)).toEqual({
      roomId: ROOM_B.id,
      title: 'Sprint planning',
      startTime: '2026-11-16T16:00:00.000Z',
      endTime: '2026-11-16T17:00:00.000Z',
      attendeesCount: 3,
    });
  });

  it('muestra un mensaje claro ante 409', async () => {
    stubFetch(() => ({ status: 409, body: { error: { code: 'CONFLICT', message: 'x' } } }));
    const onClose = vi.fn();
    renderWithProviders(<ReservationModal mode="create" rooms={rooms} date="2026-11-16" onClose={onClose} />, { user: CARLOS });
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/ya está reservada/i);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del servidor ante 422', async () => {
    stubFetch(() => ({ status: 422, body: { error: { code: 'VALIDATION', message: 'La duración máxima es de 4 horas' } } }));
    renderWithProviders(<ReservationModal mode="create" rooms={rooms} date="2026-11-16" onClose={vi.fn()} />, { user: CARLOS });
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
    expect((await screen.findByRole('alert')).textContent).toBe('La duración máxima es de 4 horas');
  });

  it('valida en cliente título corto, aforo y rango horario sin llamar a la API', () => {
    const fetchMock = stubFetch(() => ({ body: {} }));
    renderWithProviders(<ReservationModal mode="create" rooms={rooms} date="2026-11-16" onClose={vi.fn()} />, { user: CARLOS });
    fill({ title: 'ab' });
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
    expect(screen.getByRole('alert').textContent).toMatch(/título/i);
    fill({ title: 'Reunión', attendees: '9', room: ROOM_A.id });
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
    expect(screen.getByRole('alert').textContent).toMatch(/máximo 8/i);
    fill({ attendees: '2', start: '660', end: '600' });
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
    expect(screen.getByRole('alert').textContent).toMatch(/fin.*posterior/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Cancelar cierra el modal', () => {
    const onClose = vi.fn();
    renderWithProviders(<ReservationModal mode="create" rooms={rooms} date="2026-11-16" onClose={onClose} />, { user: CARLOS });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ReservationModal (mover)', () => {
  it('precarga la reserva y envía PATCH', async () => {
    const fetchMock = stubFetch(() => ({ body: reservation() }));
    const onClose = vi.fn();
    renderWithProviders(
      <ReservationModal mode="edit" reservation={reservation()} rooms={rooms} date="2026-11-16" onClose={onClose} />,
      { user: CARLOS },
    );
    expect(screen.getByRole('heading', { name: /mover reserva/i })).toBeTruthy();
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Planeación semanal');
    expect((screen.getByLabelText('Inicio') as HTMLSelectElement).value).toBe('600');
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: '720' } });
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '780' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/v1/reservations/r-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toMatchObject({
      startTime: '2026-11-16T18:00:00.000Z',
      endTime: '2026-11-16T19:00:00.000Z',
    });
  });

  it('en edición la sala actual sigue disponible aunque esté desactivada', () => {
    renderWithProviders(
      <ReservationModal mode="edit" reservation={reservation({ roomId: ROOM_C.id })} rooms={rooms} date="2026-11-16" onClose={vi.fn()} />,
      { user: CARLOS },
    );
    expect((screen.getByLabelText('Sala') as HTMLSelectElement).value).toBe(ROOM_C.id);
  });
});
