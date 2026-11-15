import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionMenu } from './ActionMenu';

const setup = () => {
  const props = { onMove: vi.fn(), onCancel: vi.fn() };
  render(<ActionMenu label="Acciones de Planeación" {...props} />);
  return props;
};

const trigger = () => screen.getByRole('button', { name: 'Acciones de Planeación' });

describe('ActionMenu', () => {
  it('muestra solo el botón de tres puntos y oculta el menú al inicio', () => {
    setup();
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('al pulsar abre un overlay con Mover y Cancelar', () => {
    setup();
    fireEvent.click(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Mover' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Cancelar reserva' })).toBeTruthy();
  });

  it('Mover llama a onMove y cierra el menú', () => {
    const p = setup();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mover' }));
    expect(p.onMove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Cancelar reserva llama a onCancel y cierra el menú', () => {
    const p = setup();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar reserva' }));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('se cierra con Escape y al hacer clic fuera', () => {
    setup();
    fireEvent.click(trigger());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(trigger());
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('un segundo clic en el disparador lo cierra', () => {
    setup();
    fireEvent.click(trigger());
    fireEvent.click(trigger());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('el overlay usa posición fija para no recortarse dentro de bloques con overflow', () => {
    setup();
    fireEvent.click(trigger());
    expect(screen.getByRole('menu').className).toContain('fixed');
  });
});
