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
    expectClose: MutableRefObject<boolean>,
  ): (() => void) => {
  const { setLastMessage, setReadyState } = setters;

  let interval: NodeJS.Timeout;
  let reconnectTimeout: NodeJS.Timeout;

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
    if (expectClose.current === false) {
      setLastMessage(message);
    }
  };
  webSocketInstance.onopen = (event: WebSocketEventMap['open']) => {
    options.onOpen && options.onOpen(event);
    reconnectCount.current = 0;
    if (expectClose.current === false) {
      setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_OPEN}));
    }
  };
  webSocketInstance.onclose = (event: WebSocketEventMap['close']) => {
    options.onClose && options.onClose(event);
    if (expectClose.current === false) {
      setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CLOSED}));
    }
    if (options.shouldReconnect && options.shouldReconnect(event)) {
      const reconnectAttempts = options.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT;
      if (reconnectCount.current < reconnectAttempts) {
        if (expectClose.current === false) {
          reconnectTimeout = setTimeout(() => {
            reconnectCount.current++;
            reconnect();
          }, options.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
        }
      } else {
        console.error(`Max reconnect attempts of ${reconnectAttempts} exceeded`);
      }
    }
  };
  webSocketInstance.onerror = (error: WebSocketEventMap['error']) => {
    options.onError && options.onError(error);

    if (options.retryOnError) {
      if (reconnectCount.current < (options.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT)) {
        reconnectTimeout = setTimeout(() => {
          reconnectCount.current++;
          reconnect();
        }, options.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
      }
    }
  };

  return () => {
    setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CLOSING}));
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    webSocketInstance.close();
    if (interval) clearInterval(interval);
  };
};
