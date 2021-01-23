import { MutableRefObject } from 'react';
import { setUpSocketIOPing } from './socket-io';
import { DEFAULT_RECONNECT_LIMIT, DEFAULT_RECONNECT_INTERVAL_MS, ReadyState } from './constants';
import { Options } from './types';

export interface Setters {
  setLastMessage: (message: WebSocketEventMap['message']) => void;
  setReadyState: (readyState: ReadyState) => void;
}

const bindMessageHandler = (
  webSocketInstance: WebSocket,
  optionsRef: MutableRefObject<Options>,
  setLastMessage: Setters['setLastMessage'],
) => {
  webSocketInstance.onmessage = (message: WebSocketEventMap['message']) => {
    optionsRef.current.onMessage && optionsRef.current.onMessage(message);
    if (typeof optionsRef.current.filter === 'function' && optionsRef.current.filter(message) !== true) {
      return;
    }
    setLastMessage(message);
  };
};

const bindOpenHandler = (
  webSocketInstance: WebSocket,
  optionsRef: MutableRefObject<Options>,
  setReadyState: Setters['setReadyState'],
  reconnectCount: MutableRefObject<number>,
) => {
  webSocketInstance.onopen = (event: WebSocketEventMap['open']) => {
    optionsRef.current.onOpen && optionsRef.current.onOpen(event);
    reconnectCount.current = 0;
    setReadyState(ReadyState.OPEN);
  };
};

const bindCloseHandler = (
  webSocketInstance: WebSocket,
  optionsRef: MutableRefObject<Options>,
  setReadyState: Setters['setReadyState'],
  reconnect: () => void,
  reconnectCount: MutableRefObject<number>,
) => {
  let reconnectTimeout: number;

  webSocketInstance.onclose = (event: WebSocketEventMap['close']) => {
    optionsRef.current.onClose && optionsRef.current.onClose(event);
    setReadyState(ReadyState.CLOSED);
    if (optionsRef.current.shouldReconnect && optionsRef.current.shouldReconnect(event)) {
      const reconnectAttempts = optionsRef.current.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT;
      if (reconnectCount.current < reconnectAttempts) {
        reconnectTimeout = window.setTimeout(() => {
          reconnectCount.current++;
          reconnect();
        }, optionsRef.current.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
      } else {
        console.error(`Max reconnect attempts of ${reconnectAttempts} exceeded`);
      }
    }
  };

  return () => reconnectTimeout && window.clearTimeout(reconnectTimeout);
};

const bindErrorHandler = (
  webSocketInstance: WebSocket,
  optionsRef: MutableRefObject<Options>,
  reconnect: () => void,
  reconnectCount: MutableRefObject<number>,
) => {
  let reconnectTimeout: number;

  webSocketInstance.onerror = (error: WebSocketEventMap['error']) => {
    optionsRef.current.onError && optionsRef.current.onError(error);

    if (optionsRef.current.retryOnError) {
      if (reconnectCount.current < (optionsRef.current.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT)) {
        reconnectTimeout = window.setTimeout(() => {
          reconnectCount.current++;
          reconnect();
        }, optionsRef.current.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
      }
    }
  };

  return () => reconnectTimeout && window.clearTimeout(reconnectTimeout);
};

export const attachListeners = (
    webSocketInstance: WebSocket,
    setters: Setters,
    optionsRef: MutableRefObject<Options>,
    reconnect: () => void,
    reconnectCount: MutableRefObject<number>,
  ): (() => void) => {
  const { setLastMessage, setReadyState } = setters;

  let interval: number;
  let cancelReconnectOnClose: () => void;
  let cancelReconnectOnError: () => void;

  if (optionsRef.current.fromSocketIO) {
    interval = setUpSocketIOPing(webSocketInstance);
  }

  bindMessageHandler(
    webSocketInstance,
    optionsRef,
    setLastMessage,
  );

  bindOpenHandler(
    webSocketInstance,
    optionsRef,
    setReadyState,
    reconnectCount,
  );

  cancelReconnectOnClose = bindCloseHandler(
    webSocketInstance,
    optionsRef,
    setReadyState,
    reconnect,
    reconnectCount,
  );

  cancelReconnectOnError = bindErrorHandler(
    webSocketInstance,
    optionsRef,
    reconnect,
    reconnectCount,
  );

  return () => {
    setReadyState(ReadyState.CLOSING);
    cancelReconnectOnClose();
    cancelReconnectOnError();
    webSocketInstance.close();
    if (interval) clearInterval(interval);
  };
};
