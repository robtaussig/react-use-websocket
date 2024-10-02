import { MutableRefObject } from 'react';
import { setUpSocketIOPing } from './socket-io';
import { heartbeat } from './heartbeat';
import {
  DEFAULT_RECONNECT_LIMIT,
  DEFAULT_RECONNECT_INTERVAL_MS,
  ReadyState,
  isEventSourceSupported,
} from './constants';
import { Options, SendMessage, WebSocketLike } from './types';
import { assertIsWebSocket } from './util';

export interface Setters {
  setLastMessage: (message: WebSocketEventMap['message']) => void;
  setReadyState: (readyState: ReadyState) => void;
}

const bindMessageHandler = (
  webSocketInstance: WebSocketLike,
  optionsRef: MutableRefObject<Options>,
  setLastMessage: Setters['setLastMessage'],
) => {
  let heartbeatCb: () => void;

  if (optionsRef.current.heartbeat && webSocketInstance instanceof WebSocket) {
    const heartbeatOptions =
      typeof optionsRef.current.heartbeat === "boolean"
        ? undefined
        : optionsRef.current.heartbeat;
    heartbeatCb = heartbeat(webSocketInstance, heartbeatOptions);
  }

  webSocketInstance.onmessage = (message: WebSocketEventMap['message']) => {
    heartbeatCb?.();
    optionsRef.current.onMessage && optionsRef.current.onMessage(message);
    if (typeof optionsRef.current.filter === 'function' && optionsRef.current.filter(message) !== true) {
      return;
    }
    if (
      optionsRef.current.heartbeat &&
      typeof optionsRef.current.heartbeat !== "boolean" &&
      optionsRef.current.heartbeat?.returnMessage === message.data
    )
      return;

    setLastMessage(message);
  };
};

const bindOpenHandler = (
  webSocketInstance: WebSocketLike,
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
  webSocketInstance: WebSocketLike,
  optionsRef: MutableRefObject<Options>,
  setReadyState: Setters['setReadyState'],
  reconnect: () => void,
  reconnectCount: MutableRefObject<number>,
) => {
  if (isEventSourceSupported && webSocketInstance instanceof EventSource) {
    return () => {};
  }
  assertIsWebSocket(webSocketInstance, optionsRef.current.skipAssert);
  let reconnectTimeout: number | undefined;

  webSocketInstance.onclose = (event: WebSocketEventMap['close']) => {
    optionsRef.current.onClose && optionsRef.current.onClose(event);
    setReadyState(ReadyState.CLOSED);
    if (optionsRef.current.shouldReconnect && optionsRef.current.shouldReconnect(event)) {
      reconnectTimeout = reconnectIfBelowAttemptLimit(optionsRef.current, reconnectCount.current, () => {
        reconnectCount.current++;
        reconnect();
      });
    }
  };

  return () => reconnectTimeout && window.clearTimeout(reconnectTimeout);
};

const bindErrorHandler = (
  webSocketInstance: WebSocketLike,
  optionsRef: MutableRefObject<Options>,
  setReadyState: Setters['setReadyState'],
  reconnect: () => void,
  reconnectCount: MutableRefObject<number>,
) => {
  let reconnectTimeout: number | undefined;

  webSocketInstance.onerror = (error: WebSocketEventMap['error']) => {
    optionsRef.current.onError && optionsRef.current.onError(error);
    if (isEventSourceSupported && webSocketInstance instanceof EventSource) {
      optionsRef.current.onClose && optionsRef.current.onClose({
        ...error,
        code: 1006,
        reason: `An error occurred with the EventSource: ${error}`,
        wasClean: false,
      });

      setReadyState(ReadyState.CLOSED);
      webSocketInstance.close();
    }

    if (optionsRef.current.retryOnError) {
      reconnectTimeout = reconnectIfBelowAttemptLimit(optionsRef.current, reconnectCount.current, () => {
        reconnectCount.current++;
        reconnect();
      });
    }
  };

  return () => reconnectTimeout && window.clearTimeout(reconnectTimeout);
};

const reconnectIfBelowAttemptLimit = (
    options: Options,
    reconnectCount: number,
    reconnect: () => void
) => {
  const reconnectAttempts = options.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT;
  if (reconnectCount >= reconnectAttempts) {
    options.onReconnectStop && options.onReconnectStop(reconnectAttempts);
    console.warn(`Max reconnect attempts of ${reconnectAttempts} exceeded`);
    return;
  }

  const nextReconnectInterval = typeof options.reconnectInterval === 'function' ?
      options.reconnectInterval(reconnectCount) :
      options.reconnectInterval;
  return window.setTimeout(reconnect, nextReconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
}

export const attachListeners = (
    webSocketInstance: WebSocketLike,
    setters: Setters,
    optionsRef: MutableRefObject<Options>,
    reconnect: () => void,
    reconnectCount: MutableRefObject<number>,
    sendMessage: SendMessage,
  ): (() => void) => {
  const { setLastMessage, setReadyState } = setters;

  let interval: number;
  let cancelReconnectOnClose: () => void;
  let cancelReconnectOnError: () => void;

  if (optionsRef.current.fromSocketIO) {
    interval = setUpSocketIOPing(sendMessage);
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
    setReadyState,
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
