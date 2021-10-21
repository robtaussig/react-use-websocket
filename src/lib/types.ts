import { MutableRefObject } from 'react';
import { ReadyState } from './constants';

export interface QueryParams {
  [key: string]: string | number;
}

export interface Options {
  fromSocketIO?: boolean;
  queryParams?: QueryParams;
  protocols?: string | string[];
  share?: boolean;
  onOpen?: (event: WebSocketEventMap['open']) => void;
  onClose?: (event: WebSocketEventMap['close']) => void;
  onMessage?: (event: WebSocketEventMap['message']) => void;
  onError?: (event: WebSocketEventMap['error']) => void;
  onReconnectStop?: (numAttempts: number) => void;
  shouldReconnect?: (event: WebSocketEventMap['close']) => boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  filter?: (message: WebSocketEventMap['message']) => boolean;
  retryOnError?: boolean;
  eventSourceOptions?: EventSourceOnly;
}

export type EventSourceOnly = Omit<Options, 'eventSourceOptions'> & EventSourceInit;

export interface EventSourceEventHandlers {
  [eventName: string]: (message: EventSourceEventMap['message']) => void;
}

export interface EventSourceOptions extends EventSourceOnly {
  events?: EventSourceEventHandlers;
}

export type ReadyStateState = {
  [url: string]: ReadyState,
}

export type WebSocketMessage = string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;

export type SendMessage = (message: WebSocketMessage, keep?: boolean) => void;
export type SendJsonMessage = (jsonMessage: any, keep?: boolean) => void;

export type Subscriber<T = WebSocketEventMap['message']> = {
  setLastMessage: (message: T) => void,
  setReadyState: (readyState: ReadyState) => void,
  optionsRef: MutableRefObject<Options>,
  reconnectCount: MutableRefObject<number>,
  reconnect: MutableRefObject<() => void>,
}

export type WebSocketHook<T = WebSocketEventMap['message']> = {
  sendMessage: SendMessage,
  sendJsonMessage: SendJsonMessage,
  lastMessage: T | null,
  lastJsonMessage: any,
  readyState: ReadyState,
  getWebSocket: () => (WebSocketLike | null),
}

export type EventSourceHook = Omit<
  WebSocketHook<EventSourceEventMap['message']>,
  'sendMessage' | 'sendJsonMessage' | 'lastMessage' | 'lastJsonMessage' | 'getWebSocket'
> & {
  lastEvent: EventSourceEventMap['message'] | null,
  getEventSource: () => (WebSocketLike | null),
}

export type WebSocketLike = WebSocket | EventSource;
