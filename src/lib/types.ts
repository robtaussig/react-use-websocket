import { ReadyState } from './constants';

export interface QueryParams {
  [key: string]: string | number;
}

export interface Options {
  fromSocketIO?: boolean;
  queryParams?: QueryParams;
  share?: boolean;
  onOpen?: (
    event: WebSocketEventMap['open'],
    sendMessage: SendMessage,
  ) => void;
  onClose?: (event: WebSocketEventMap['close']) => void;
  onMessage?: (event: WebSocketEventMap['message']) => void;
  onError?: (event: WebSocketEventMap['error']) => void;
  shouldReconnect?: (event: WebSocketEventMap['close']) => boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  filter?: (message: WebSocketEventMap['message']) => boolean;
  retryOnError?: boolean;
  enforceStaticOptions?: boolean;
}

export type ReadyStateState = {
  [url: string]: ReadyState,
}

export type WebSocketMessage = string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;

export type SendMessage = (message: WebSocketMessage) => void;
