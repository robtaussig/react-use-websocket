import { MutableRefObject } from 'react';
import { setUpSocketIOPing } from './socket-io';
import { READY_STATE_OPEN, READY_STATE_CLOSED, READY_STATE_CLOSING, DEFAULT_RECONNECT_LIMIT, DEFAULT_RECONNECT_INTERVAL_MS } from './constants';
import { addSubscriber } from './add-subscriber';
import { ReadyStateState, Options } from './use-websocket';

export interface Setters {
  setLastMessage: (message: WebSocketEventMap['message']) => void;
  setReadyState: (callback: (prev: ReadyStateState) => ReadyStateState) => void;
}

export const attachListeners = (
    webSocketInstance: WebSocket,
    url: string,
    setters: Setters,
    options: Options,
    reconnect: () => void,
    reconnectCount: MutableRefObject<number>,
  ) => {
  const { setLastMessage, setReadyState } = setters;

  let interval: NodeJS.Timeout;

  if (options.fromSocketIO) {
    interval = setUpSocketIOPing(webSocketInstance);
  }

  if (options.share) {
    const removeSubscriber = addSubscriber(webSocketInstance, url, {
      setLastMessage,
      setReadyState,
    }, options);

    return removeSubscriber;
  }
  
  webSocketInstance.onmessage = (message: WebSocketEventMap['message']) => {
    options.onMessage && options.onMessage(message);
    if (typeof options.filter === 'function' && options.filter(message) !== true) {
      return;
    }
    setLastMessage(message);
  };
  webSocketInstance.onopen = (event: WebSocketEventMap['open']) => {
    options.onOpen && options.onOpen(event);
    reconnectCount.current = 0;
    setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_OPEN}));
  };
  webSocketInstance.onclose = (event: WebSocketEventMap['close']) => {
    options.onClose && options.onClose(event);
    setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CLOSED}));
    if (options.shouldReconnect && options.shouldReconnect(event)) {
      const reconnectAttempts = options.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT;
      if (reconnectCount.current < reconnectAttempts) {
        setTimeout(() => {
          reconnectCount.current++;
          reconnect();
        }, options.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
      } else {
        console.error(`Max reconnect attempts of ${reconnectAttempts} exceeded`);
      }
    }
  };
  webSocketInstance.onerror = (error: WebSocketEventMap['error']) => {
    options.onError && options.onError(error);

    if (options.retryOnError) {
      if (reconnectCount.current < (options.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT)) {
        setTimeout(() => {
          reconnectCount.current++;
          reconnect();
        }, options.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
      }
    }
  };

  return () => {
    setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CLOSING}));
    webSocketInstance.close();
    if (interval) clearInterval(interval);
  };
};
