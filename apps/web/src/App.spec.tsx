import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { CARLOS, HR_USER, renderWithProviders, ROOMS, stubFetch, USERS } from './test/testUtils';

class NoopWebSocket {
  onopen = null;
  onclose = null;
  onmessage = null;
  close() {}
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', NoopWebSocket);
    stubFetch((url) => {
      if (url.endsWith('/users')) return { body: USERS };
      if (url.endsWith('/rooms')) return { body: ROOMS };
      return { body: [] };
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sin usuario muestra el título y la pantalla de selección de identidad', async () => {
    renderWithProviders(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /reservas de salas/i })).toBeTruthy();
    expect(await screen.findByRole('dialog', { name: /selecciona tu usuario/i })).toBeTruthy();
  });

  it('con usuario muestra el calendario y oculta la administración a EMPLOYEE', async () => {
    renderWithProviders(<App />, { user: CARLOS });
    expect(await screen.findByRole('button', { name: '+ Nueva Reserva' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Administración de Salas' })).toBeNull();
    expect(screen.queryByRole('dialog', { name: /selecciona tu usuario/i })).toBeNull();
  });

  it('HR navega por estado a la administración de salas', async () => {
    renderWithProviders(<App />, { user: HR_USER });
    fireEvent.click(await screen.findByRole('tab', { name: 'Administración de Salas' }));
    expect(await screen.findByRole('heading', { name: 'Administración de Salas' })).toBeTruthy();
  });

  it('"Cambiar usuario" regresa a la selección de identidad', async () => {
    renderWithProviders(<App />, { user: CARLOS });
    fireEvent.click(await screen.findByRole('button', { name: /cambiar usuario/i }));
    expect(await screen.findByRole('dialog', { name: /selecciona tu usuario/i })).toBeTruthy();
  });
});
