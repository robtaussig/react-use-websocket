import { MutableRefObject } from 'react';
import { setUpSocketIOPing } from './socket-io';
import { DEFAULT_RECONNECT_LIMIT, DEFAULT_RECONNECT_INTERVAL_MS, ReadyState } from './constants';
import { addSubscriber } from './add-subscriber';
import { ReadyStateState, Options, SendMessage } from './types';

export interface Setters {
  setLastMessage: (message: WebSocketEventMap['message']) => void;
  setReadyState: (callback: (prev: ReadyStateState) => ReadyStateState) => void;
}

export const attachListeners = (
    webSocketInstance: WebSocket,
    url: string,
    setters: Setters,
    optionsRef: MutableRefObject<Options>,
    reconnect: () => void,
    reconnectCount: MutableRefObject<number>,
    expectClose: MutableRefObject<boolean>,
  ): (() => void) => {
  const { setLastMessage, setReadyState } = setters;

  let interval: NodeJS.Timeout;
  let reconnectTimeout: NodeJS.Timeout;

  if (optionsRef.current.fromSocketIO) {
    interval = setUpSocketIOPing(webSocketInstance);
  }

  if (optionsRef.current.share) {
    const removeSubscriber = addSubscriber(webSocketInstance, url, {
      setLastMessage,
      setReadyState,
    }, optionsRef, reconnect, reconnectCount, expectClose);

    return removeSubscriber;
  }
  
  webSocketInstance.onmessage = (message: WebSocketEventMap['message']) => {
    optionsRef.current.onMessage && optionsRef.current.onMessage(message);
    if (typeof optionsRef.current.filter === 'function' && optionsRef.current.filter(message) !== true) {
      return;
    }
    if (expectClose.current === false) {
      setLastMessage(message);
    }
  };
  webSocketInstance.onopen = (event: WebSocketEventMap['open']) => {
    optionsRef.current.onOpen && optionsRef.current.onOpen(event);
    reconnectCount.current = 0;
    if (expectClose.current === false) {
      setReadyState(prev => Object.assign({}, prev, {[url]: ReadyState.OPEN}));
    }
  };
  webSocketInstance.onclose = (event: WebSocketEventMap['close']) => {
    optionsRef.current.onClose && optionsRef.current.onClose(event);
    if (expectClose.current === false) {
      setReadyState(prev => Object.assign({}, prev, {[url]: ReadyState.CLOSED}));
    }
    if (optionsRef.current.shouldReconnect && optionsRef.current.shouldReconnect(event)) {
      const reconnectAttempts = optionsRef.current.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT;
      if (reconnectCount.current < reconnectAttempts) {
        if (expectClose.current === false) {
          reconnectTimeout = setTimeout(() => {
            reconnectCount.current++;
            reconnect();
          }, optionsRef.current.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
        }
      } else {
        console.error(`Max reconnect attempts of ${reconnectAttempts} exceeded`);
      }
    }
  };
  webSocketInstance.onerror = (error: WebSocketEventMap['error']) => {
    optionsRef.current.onError && optionsRef.current.onError(error);

    if (optionsRef.current.retryOnError) {
      if (reconnectCount.current < (optionsRef.current.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT)) {
        reconnectTimeout = setTimeout(() => {
          reconnectCount.current++;
          reconnect();
        }, optionsRef.current.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
      }
    }
  };

  return () => {
    setReadyState(prev => Object.assign({}, prev, {[url]: ReadyState.CLOSING}));
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    webSocketInstance.close();
    if (interval) clearInterval(interval);
  };
};
