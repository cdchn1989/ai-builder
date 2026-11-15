import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebSocketSync } from './useWebSocketSync';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  close = vi.fn(() => {
    this.onclose = null;
  });
  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }
}

const setup = () => {
  const queryClient = new QueryClient();
  const spy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useWebSocketSync('ws://test/ws'), { wrapper });
  return { spy, ...hook, ws: () => FakeWebSocket.instances.at(-1)! };
};

describe('useWebSocketSync', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });
  afterEach(() => vi.useRealTimers());

  it('se conecta a la URL y refleja el estado en vivo', () => {
    const { result, ws } = setup();
    expect(ws().url).toBe('ws://test/ws');
    expect(result.current).toBe(false);
    act(() => ws().onopen?.());
    expect(result.current).toBe(true);
    act(() => ws().onclose?.());
    expect(result.current).toBe(false);
  });

  it('invalida la caché según la entidad del evento DATA_INVALIDATED', () => {
    const { spy, ws } = setup();
    act(() => ws().onmessage?.({ data: JSON.stringify({ type: 'DATA_INVALIDATED', entity: 'reservations', timestamp: '2026-11-16T10:00:00.000Z' }) }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['reservations'] });
    act(() => ws().onmessage?.({ data: JSON.stringify({ type: 'DATA_INVALIDATED', entity: 'rooms', timestamp: '2026-11-16T10:00:00.000Z' }) }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['rooms'] });
  });

  it('ignora mensajes inválidos', () => {
    const { spy, ws } = setup();
    act(() => ws().onmessage?.({ data: 'no-json' }));
    act(() => ws().onmessage?.({ data: JSON.stringify({ type: 'OTHER' }) }));
    expect(spy).not.toHaveBeenCalled();
  });

  it('reconecta tras cerrarse y cierra al desmontar', () => {
    vi.useFakeTimers();
    const { ws, unmount } = setup();
    const first = ws();
    act(() => first.onclose?.());
    act(() => void vi.advanceTimersByTime(3000));
    expect(FakeWebSocket.instances).toHaveLength(2);
    unmount();
    expect(ws().close).toHaveBeenCalled();
  });
});
