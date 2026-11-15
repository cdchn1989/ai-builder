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
    fireEvent.click(screen.getByRole('button', { name: /acciones de/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mover' }));
    expect(p.onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1' }));
    fireEvent.click(screen.getByRole('button', { name: /acciones de/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar reserva' }));
    expect(p.onCancel).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1' }));
  });

  it('las acciones viven en un menú de tres puntos dentro de la fila superior del bloque', () => {
    setup(CARLOS, [reservation({ startTime: '2026-11-16T15:00:00.000Z', endTime: '2026-11-16T15:30:00.000Z' })]);
    const trigger = screen.getByRole('button', { name: /acciones de/i });
    const header = within(trigger.closest('article')!).getByText('Planeación semanal').parentElement!;
    expect(header.contains(trigger)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Mover' })).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('hora y reservador van en elementos separados y la hora nunca se trunca', () => {
    setup();
    const time = screen.getByText('10:00–11:00');
    expect(time.className).toContain('shrink-0');
    expect(time.className).not.toContain('truncate');
    expect(screen.getByText(CARLOS.name)).not.toBe(time);
  });

  it('el bloque expone título, hora y reservador completos como tooltip', () => {
    setup();
    const article = screen.getByText('Planeación semanal').closest('article')!;
    expect(article.getAttribute('title')).toBe(`Planeación semanal · 10:00–11:00 · ${CARLOS.name}`);
  });

  it('en reservas de 30 min el badge de RR. HH. es compacto con tooltip accesible', () => {
    setup(CARLOS, [reservation({ movedByHr: true, startTime: '2026-11-16T16:00:00.000Z', endTime: '2026-11-16T16:30:00.000Z' })]);
    expect(screen.queryByText('Reagendada por RR. HH.')).toBeNull();
    expect(screen.getByLabelText('Reagendada por RR. HH.')).toBeTruthy();
  });

  it('EMPLOYEE no ve acciones en reservas ajenas', () => {
    setup(MARIA);
    expect(screen.queryByRole('button', { name: /acciones de/i })).toBeNull();
  });

  it('EMPLOYEE no ve acciones dentro de la ventana de 30 min', () => {
    setup(CARLOS, [reservation({ startTime: '2026-11-16T14:20:00.000Z', endTime: '2026-11-16T15:00:00.000Z' })]);
    expect(screen.queryByRole('button', { name: /acciones de/i })).toBeNull();
  });

  it('HR ve acciones en cualquier reserva, incluso inminente', () => {
    setup(HR_USER, [reservation({ startTime: '2026-11-16T14:05:00.000Z', endTime: '2026-11-16T15:00:00.000Z' })]);
    expect(screen.getAllByRole('button', { name: /acciones de/i })).toHaveLength(1);
  });
});
