import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Header } from './Header';
import { activeTabAtom, currentUserAtom } from '../../shared/store/atoms';
import { CARLOS, HR_USER, renderWithProviders } from '../../test/testUtils';

describe('Header', () => {
  it('muestra título, badge de usuario y estado en vivo', () => {
    renderWithProviders(<Header connected />, { user: CARLOS });
    expect(screen.getByRole('heading', { level: 1, name: /reservas de salas/i })).toBeTruthy();
    expect(screen.getByText(/Carlos Pérez/)).toBeTruthy();
    expect(screen.getByText('EMPLOYEE')).toBeTruthy();
    expect(screen.getByText(/en vivo/i)).toBeTruthy();
  });

  it('indica desconexión del WebSocket', () => {
    renderWithProviders(<Header connected={false} />, { user: CARLOS });
    expect(screen.getByText(/sin conexión/i)).toBeTruthy();
  });

  it('EMPLOYEE solo ve la pestaña Calendario', () => {
    renderWithProviders(<Header connected />, { user: CARLOS });
    expect(screen.getByRole('tab', { name: 'Calendario' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Administración de Salas' })).toBeNull();
  });

  it('HR ve ambas pestañas y puede cambiar de pestaña', () => {
    const { store } = renderWithProviders(<Header connected />, { user: HR_USER });
    fireEvent.click(screen.getByRole('tab', { name: 'Administración de Salas' }));
    expect(store.get(activeTabAtom)).toBe('rooms');
    fireEvent.click(screen.getByRole('tab', { name: 'Calendario' }));
    expect(store.get(activeTabAtom)).toBe('calendar');
  });

  it('"Cambiar usuario" limpia el usuario y vuelve al calendario', () => {
    const { store } = renderWithProviders(<Header connected />, { user: HR_USER });
    store.set(activeTabAtom, 'rooms');
    fireEvent.click(screen.getByRole('button', { name: /cambiar usuario/i }));
    expect(store.get(currentUserAtom)).toBeNull();
    expect(store.get(activeTabAtom)).toBe('calendar');
  });
});
