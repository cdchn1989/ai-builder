import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserGateModal } from './UserGateModal';
import { currentUserAtom } from '../../shared/store/atoms';
import { CARLOS, renderWithProviders, stubFetch, USERS } from '../../test/testUtils';

describe('UserGateModal', () => {
  it('muestra los 4 accesos rápidos con su rol', async () => {
    stubFetch(() => ({ body: USERS }));
    renderWithProviders(<UserGateModal />);
    expect(await screen.findByRole('button', { name: 'Ana Morales [HR]' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Carlos Pérez [EMPLOYEE]' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'María López [EMPLOYEE]' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Javier Reyes [EMPLOYEE]' })).toBeTruthy();
  });

  it('un clic en un acceso rápido define el usuario actual', async () => {
    stubFetch(() => ({ body: USERS }));
    const { store } = renderWithProviders(<UserGateModal />);
    fireEvent.click(await screen.findByRole('button', { name: 'Carlos Pérez [EMPLOYEE]' }));
    expect(store.get(currentUserAtom)).toEqual(CARLOS);
  });

  it('el buscador filtra por nombre o correo en tiempo real', async () => {
    stubFetch(() => ({ body: USERS }));
    renderWithProviders(<UserGateModal />);
    await screen.findByRole('button', { name: 'Ana Morales [HR]' });
    const box = screen.getByRole('searchbox', { name: /buscar/i });
    fireEvent.change(box, { target: { value: 'lucia.fern' } });
    expect(screen.getByText('Lucía Fernández')).toBeTruthy();
    expect(screen.queryByText('Javier Reyes', { selector: 'li *' })).toBeNull();
    fireEvent.change(box, { target: { value: 'zzz' } });
    expect(screen.getByText(/sin resultados/i)).toBeTruthy();
  });

  it('elegir un resultado del buscador define el usuario', async () => {
    stubFetch(() => ({ body: USERS }));
    const { store } = renderWithProviders(<UserGateModal />);
    await screen.findByRole('button', { name: 'Ana Morales [HR]' });
    fireEvent.change(screen.getByRole('searchbox', { name: /buscar/i }), { target: { value: 'lucía' } });
    fireEvent.click(screen.getByRole('button', { name: /Lucía Fernández/ }));
    expect(store.get(currentUserAtom)?.id).toBe('u-lucia');
  });

  it('informa si falla la carga de usuarios', async () => {
    stubFetch(() => ({ status: 500, body: { error: { code: 'INTERNAL', message: 'x' } } }));
    renderWithProviders(<UserGateModal />);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
