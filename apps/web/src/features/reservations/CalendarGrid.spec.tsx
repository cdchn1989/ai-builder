import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarGrid } from './CalendarGrid';
import { CARLOS, HR_USER, MARIA, reservation, ROOM_A, ROOM_B } from '../../test/testUtils';

const now = new Date('2026-11-16T14:00:00Z'); // 08:00 de negocio

const setup = (user = CARLOS, reservations = [reservation()]) => {
  const props = { onMove: vi.fn(), onCancel: vi.fn() };
  render(
    <CalendarGrid
      date="2026-11-16"
      rooms={[ROOM_A, ROOM_B]}
      reservations={reservations}
      currentUser={user}
      now={now}
      {...props}
    />,
  );
  return props;
};

describe('CalendarGrid', () => {
  it('dibuja encabezados por sala y la escala 07:00–19:30', () => {
    setup();
    expect(screen.getByText('Sala Andes')).toBeTruthy();
    expect(screen.getByText('Sala Boreal')).toBeTruthy();
    expect(screen.getByText('07:00')).toBeTruthy();
    expect(screen.getByText('19:30')).toBeTruthy();
    expect(screen.queryByText('20:00')).toBeNull();
  });

  it('coloca cada reserva en la columna de su sala', () => {
    setup(CARLOS, [reservation(), reservation({ id: 'r-2', roomId: ROOM_B.id, title: 'Retro' })]);
    expect(within(screen.getByTestId(`col-${ROOM_A.id}`)).getByText('Planeación semanal')).toBeTruthy();
    expect(within(screen.getByTestId(`col-${ROOM_B.id}`)).getByText('Retro')).toBeTruthy();
  });

  it('muestra el badge "Reagendada por RR. HH." solo si movedByHr', () => {
    setup(CARLOS, [reservation({ movedByHr: true }), reservation({ id: 'r-2', title: 'Otra' })]);
    expect(screen.getAllByText('Reagendada por RR. HH.')).toHaveLength(1);
  });

  it('EMPLOYEE ve Mover/Cancelar en su reserva con >= 30 min', () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Mover' }));
    expect(p.onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(p.onCancel).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1' }));
  });

  it('EMPLOYEE no ve acciones en reservas ajenas', () => {
    setup(MARIA);
    expect(screen.queryByRole('button', { name: 'Mover' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
  });

  it('EMPLOYEE no ve acciones dentro de la ventana de 30 min', () => {
    setup(CARLOS, [reservation({ startTime: '2026-11-16T14:20:00.000Z', endTime: '2026-11-16T15:00:00.000Z' })]);
    expect(screen.queryByRole('button', { name: 'Mover' })).toBeNull();
  });

  it('HR ve acciones en cualquier reserva, incluso inminente', () => {
    setup(HR_USER, [reservation({ startTime: '2026-11-16T14:05:00.000Z', endTime: '2026-11-16T15:00:00.000Z' })]);
    expect(screen.getByRole('button', { name: 'Mover' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });
});
