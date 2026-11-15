import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomFilterSidebar } from './RoomFilterSidebar';
import { ROOM_A, ROOM_B } from '../../test/testUtils';

const setup = (visibleIds = [ROOM_A.id, ROOM_B.id]) => {
  const props = {
    rooms: [ROOM_A, ROOM_B],
    visibleIds,
    date: '2026-11-16',
    onToggleRoom: vi.fn(),
    onDateChange: vi.fn(),
    onNewReservation: vi.fn(),
  };
  render(<RoomFilterSidebar {...props} />);
  return props;
};

describe('RoomFilterSidebar', () => {
  it('lista un checkbox por sala reflejando su visibilidad', () => {
    setup([ROOM_A.id]);
    expect((screen.getByRole('checkbox', { name: /Sala Andes/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /Sala Boreal/ }) as HTMLInputElement).checked).toBe(false);
  });
  it('notifica al alternar una sala', () => {
    const p = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: /Sala Boreal/ }));
    expect(p.onToggleRoom).toHaveBeenCalledWith(ROOM_B.id);
  });
  it('botón "+ Nueva Reserva"', () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva Reserva' }));
    expect(p.onNewReservation).toHaveBeenCalled();
  });
  it('selector de fecha', () => {
    const p = setup();
    fireEvent.change(screen.getByLabelText(/fecha/i), { target: { value: '2026-11-17' } });
    expect(p.onDateChange).toHaveBeenCalledWith('2026-11-17');
  });
  it('es colapsable', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /ocultar panel/i }));
    expect(screen.queryByRole('checkbox', { name: /Sala Andes/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /mostrar panel/i }));
    expect(screen.getByRole('checkbox', { name: /Sala Andes/ })).toBeTruthy();
  });
});
