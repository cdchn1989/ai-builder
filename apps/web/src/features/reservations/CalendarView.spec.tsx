import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalendarView } from './CalendarView';
import { selectedDateAtom } from '../../shared/store/atoms';
import { HR_USER, renderWithProviders, reservation, ROOM_A, ROOM_B, ROOM_C, ROOMS, stubFetch } from '../../test/testUtils';

const api = (extra?: (url: string, init: RequestInit) => ReturnType<Parameters<typeof stubFetch>[0]>) =>
  stubFetch((url, init) => {
    const custom = extra?.(url, init);
    if (custom) return custom;
    if (url.includes('/rooms')) return { body: ROOMS };
    if (url.includes('/reservations?date=2026-11-16')) return { body: [reservation()] };
    if (url.includes('/reservations')) return { body: [] };
    return undefined;
  });

const setup = () => {
  const utils = renderWithProviders(<CalendarView />, { user: HR_USER });
  utils.store.set(selectedDateAtom, '2026-11-16');
  return utils;
};

describe('CalendarView', () => {
  it('carga salas activas y las reservas del día seleccionado', async () => {
    api();
    setup();
    expect(await screen.findByText('Planeación semanal')).toBeTruthy();
    expect(within(screen.getByTestId(`col-${ROOM_A.id}`)).getByText('Planeación semanal')).toBeTruthy();
    expect(screen.queryByTestId(`col-${ROOM_C.id}`)).toBeNull(); // sala desactivada
  });

  it('desmarcar una sala oculta su columna', async () => {
    api();
    setup();
    await screen.findByText('Planeación semanal');
    fireEvent.click(screen.getByRole('checkbox', { name: /Sala Boreal/ }));
    expect(screen.queryByTestId(`col-${ROOM_B.id}`)).toBeNull();
    expect(screen.getByTestId(`col-${ROOM_A.id}`)).toBeTruthy();
  });

  it('"+ Nueva Reserva" abre el modal', async () => {
    api();
    setup();
    await screen.findByText('Planeación semanal');
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva Reserva' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /nueva reserva/i })).toBeTruthy();
  });

  it('"Mover" abre el modal de edición', async () => {
    api();
    setup();
    await screen.findByText('Planeación semanal');
    fireEvent.click(screen.getByRole('button', { name: /acciones de/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mover' }));
    expect(screen.getByRole('heading', { name: /mover reserva/i })).toBeTruthy();
  });

  it('"Cancelar" envía DELETE con x-user-id', async () => {
    const fetchMock = api((url, init) => (init.method === 'DELETE' ? { body: reservation({ status: 'CANCELLED' }) } : undefined));
    setup();
    await screen.findByText('Planeación semanal');
    fireEvent.click(screen.getByRole('button', { name: /acciones de/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar reserva' }));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit).method === 'DELETE')).toBe(true));
    const call = fetchMock.mock.calls.find((c) => (c[1] as RequestInit).method === 'DELETE')!;
    expect(call[0]).toBe('http://localhost:3000/api/v1/reservations/r-1');
    expect(((call[1] as RequestInit).headers as Record<string, string>)['x-user-id']).toBe(HR_USER.id);
  });

  it('muestra un aviso si cancelar falla', async () => {
    api((url, init) => (init.method === 'DELETE' ? { status: 422, body: { error: { code: 'VALIDATION', message: 'Faltan menos de 30 minutos' } } } : undefined));
    setup();
    await screen.findByText('Planeación semanal');
    fireEvent.click(screen.getByRole('button', { name: /acciones de/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar reserva' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Faltan menos de 30 minutos');
  });
});
