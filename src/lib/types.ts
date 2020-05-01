import { MutableRefObject } from 'react';
import { ReadyState } from './constants';

export interface QueryParams {
  [key: string]: string | number;
}

export interface Options {
  fromSocketIO?: boolean;
  queryParams?: QueryParams;
  share?: boolean;
  onOpen?: (event: WebSocketEventMap['open']) => void;
  onClose?: (event: WebSocketEventMap['close']) => void;
  onMessage?: (event: WebSocketEventMap['message']) => void;
  onError?: (event: WebSocketEventMap['error']) => void;
  shouldReconnect?: (event: WebSocketEventMap['close']) => boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  filter?: (message: WebSocketEventMap['message']) => boolean;
  retryOnError?: boolean;
}

export type ReadyStateState = {
  [url: string]: ReadyState,
}

export type WebSocketMessage = string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;

export type SendMessage = (message: WebSocketMessage) => void;
export type SendJsonMessage = (jsonMessage: any) => void;

export type Subscriber<T = WebSocketEventMap['message']> = {
  setLastMessage: (message: T) => void,
  setReadyState: (callback: (prev: ReadyStateState) => ReadyStateState) => void,
  optionsRef: MutableRefObject<Options>,
  reconnect: () => void;
}

export type WebSocketHook<T = WebSocketEventMap['message']> = {
  sendMessage: SendMessage,
  sendJsonMessage: SendJsonMessage,
  lastMessage: T,
  lastJsonMessage: any,
  readyState: ReadyState,
  getWebSocket: () => WebSocket,
}
