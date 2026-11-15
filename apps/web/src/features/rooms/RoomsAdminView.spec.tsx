import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoomsAdminView } from './RoomsAdminView';
import { HR_USER, renderWithProviders, ROOM_A, ROOM_C, ROOMS, stubFetch } from '../../test/testUtils';

describe('RoomsAdminView', () => {
  it('lista las salas con su estado Activa/Desactivada', async () => {
    stubFetch(() => ({ body: ROOMS }));
    renderWithProviders(<RoomsAdminView />, { user: HR_USER });
    expect(await screen.findByTestId(`room-${ROOM_A.id}`)).toBeTruthy();
    expect(within(screen.getByTestId(`room-${ROOM_A.id}`)).getByText('Activa')).toBeTruthy();
    expect(within(screen.getByTestId(`room-${ROOM_C.id}`)).getByText('Desactivada')).toBeTruthy();
  });

  it('edita nombre, capacidad y equipamiento con PATCH', async () => {
    const fetchMock = stubFetch((url, init) => (init.method === 'PATCH' ? { body: ROOM_A } : { body: ROOMS }));
    renderWithProviders(<RoomsAdminView />, { user: HR_USER });
    const card = within(await screen.findByTestId(`room-${ROOM_A.id}`));
    fireEvent.change(card.getByLabelText('Nombre'), { target: { value: 'Sala Volcán' } });
    fireEvent.change(card.getByLabelText('Capacidad'), { target: { value: '12' } });
    fireEvent.change(card.getByLabelText('Equipamiento'), { target: { value: 'TV 4K' } });
    fireEvent.click(card.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit).method === 'PATCH')).toBe(true));
    const call = fetchMock.mock.calls.find((c) => (c[1] as RequestInit).method === 'PATCH')!;
    expect(call[0]).toBe(`http://localhost:3000/api/v1/rooms/${ROOM_A.id}`);
    expect(((call[1] as RequestInit).headers as Record<string, string>)['x-user-id']).toBe(HR_USER.id);
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ name: 'Sala Volcán', capacity: 12, equipment: 'TV 4K' });
  });

  it('el toggle activa/desactiva con PATCH { isActive }', async () => {
    const fetchMock = stubFetch((url, init) => (init.method === 'PATCH' ? { body: ROOM_A } : { body: ROOMS }));
    renderWithProviders(<RoomsAdminView />, { user: HR_USER });
    const card = within(await screen.findByTestId(`room-${ROOM_A.id}`));
    fireEvent.click(card.getByRole('button', { name: /desactivar/i }));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit).method === 'PATCH')).toBe(true));
    const call = fetchMock.mock.calls.find((c) => (c[1] as RequestInit).method === 'PATCH')!;
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ isActive: false });
    const cardC = within(screen.getByTestId(`room-${ROOM_C.id}`));
    expect(cardC.getByRole('button', { name: /activar/i })).toBeTruthy();
  });

  it('muestra el error si el guardado falla', async () => {
    stubFetch((url, init) =>
      init.method === 'PATCH' ? { status: 403, body: { error: { code: 'FORBIDDEN', message: 'x' } } } : { body: ROOMS },
    );
    renderWithProviders(<RoomsAdminView />, { user: HR_USER });
    const card = within(await screen.findByTestId(`room-${ROOM_A.id}`));
    fireEvent.click(card.getByRole('button', { name: 'Guardar' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/permiso/i);
  });
});
