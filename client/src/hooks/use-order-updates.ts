import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

type OrderEventHandler = (data: any) => void;

interface UseOrderUpdatesOptions {
  onOrderCreated?: OrderEventHandler;
  onOrderStatusChanged?: OrderEventHandler;
  onOrderAssigned?: OrderEventHandler;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useOrderUpdates(options: UseOrderUpdatesOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    try {
      const eventSource = new EventSource('/api/orders/sse');
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', () => {
        reconnectAttempts.current = 0;
        options.onConnected?.();
      });

      eventSource.addEventListener('order_created', (event) => {
        const data = JSON.parse(event.data);
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        options.onOrderCreated?.(data);
      });

      eventSource.addEventListener('order_status_changed', (event) => {
        const data = JSON.parse(event.data);
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        options.onOrderStatusChanged?.(data);
      });

      eventSource.addEventListener('order_assigned', (event) => {
        const data = JSON.parse(event.data);
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        options.onOrderAssigned?.(data);
      });

      eventSource.addEventListener('heartbeat', () => {
        // Keep connection alive
      });

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        options.onDisconnected?.();

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to connect to SSE:', error);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
    reconnect: connect,
    disconnect,
  };
}
