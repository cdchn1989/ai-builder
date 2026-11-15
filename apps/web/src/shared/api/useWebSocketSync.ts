import { WsEventSchema } from '@reservas/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const RECONNECT_MS = 2000;

/** Escucha el WS e invalida `['reservations']` / `['rooms']`; devuelve si está conectado. */
export function useWebSocketSync(url: string): boolean {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const connect = () => {
      socket = new WebSocket(url);
      socket.onopen = () => setConnected(true);
      socket.onclose = () => {
        setConnected(false);
        if (!disposed) timer = setTimeout(connect, RECONNECT_MS);
      };
      socket.onmessage = (event: MessageEvent<string> | { data: string }) => {
        try {
          const parsed = WsEventSchema.safeParse(JSON.parse(event.data));
          if (parsed.success) void queryClient.invalidateQueries({ queryKey: [parsed.data.entity] });
        } catch {
          /* mensaje no JSON: se ignora */
        }
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      socket?.close();
    };
  }, [url, queryClient]);

  return connected;
}
