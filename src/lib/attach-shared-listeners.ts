import { sharedWebSockets } from './globals';
import { DEFAULT_RECONNECT_LIMIT, DEFAULT_RECONNECT_INTERVAL_MS, ReadyState } from './constants';
import { getSubscribers } from './manage-subscribers';

const bindMessageHandler = (
  webSocketInstance: WebSocket,
  url: string,
) => {
  webSocketInstance.onmessage = (message: WebSocketEventMap['message']) => {
    getSubscribers(url).forEach(subscriber => {
      if (subscriber.optionsRef.current.onMessage) {
        subscriber.optionsRef.current.onMessage(message);
      }

      if (
        typeof subscriber.optionsRef.current.filter === 'function' &&
        subscriber.optionsRef.current.filter(message) !== true
      ) {
        return;
      }

      subscriber.setLastMessage(message);
    });
  };
};

const bindOpenHandler = (
  webSocketInstance: WebSocket,
  url: string,
) => {
  webSocketInstance.onopen = (event: WebSocketEventMap['open']) => {
    getSubscribers(url).forEach(subscriber => {
      subscriber.reconnectCount.current = 0;
      if (subscriber.optionsRef.current.onOpen) {
        subscriber.optionsRef.current.onOpen(event);
      }

      subscriber.setReadyState(ReadyState.OPEN);
    });
  };
};

const bindCloseHandler = (
  webSocketInstance: WebSocket,
  url: string,
) => {
  webSocketInstance.onclose = (event: WebSocketEventMap['close']) => {
    getSubscribers(url).forEach(subscriber => {
      if (subscriber.optionsRef.current.onClose) {
        subscriber.optionsRef.current.onClose(event);
      }

      subscriber.setReadyState(ReadyState.CLOSED);
    });
    
    delete sharedWebSockets[url];

    getSubscribers(url).forEach(subscriber => {
      if (
        subscriber.optionsRef.current.shouldReconnect &&
        subscriber.optionsRef.current.shouldReconnect(event)
      ) {
        const reconnectAttempts = subscriber.optionsRef.current.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT;
        if (subscriber.reconnectCount.current < reconnectAttempts) {
          if (subscriber.reconnectCount.current++ === 0) {
            subscriber.reconnect.current();
          } else {
            setTimeout(() => {
              subscriber.reconnect.current();
            }, subscriber.optionsRef.current.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
          }
        } else {
          console.error(`Max reconnect attempts of ${reconnectAttempts} exceeded`);
        }
      }
    });
  };
};

const bindErrorHandler = (
  webSocketInstance: WebSocket,
  url: string,
) => {
  webSocketInstance.onerror = (error: WebSocketEventMap['error']) => {
    getSubscribers(url).forEach(subscriber => {
      if (subscriber.optionsRef.current.onError) {
        subscriber.optionsRef.current.onError(error);
      }
    });
  };
};

export const attachSharedListeners = (
  webSocketInstance: WebSocket,
  url: string,
) => {
  
  bindMessageHandler(webSocketInstance, url);
  bindCloseHandler(webSocketInstance, url);
  bindOpenHandler(webSocketInstance, url);
  bindErrorHandler(webSocketInstance, url);
};
