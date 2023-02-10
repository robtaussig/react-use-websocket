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
  reconnectInterval?: number | ((lastAttemptNumber: number) => number);
  reconnectAttempts?: number;
  filter?: (message: WebSocketEventMap['message']) => boolean;
  retryOnError?: boolean;
  eventSourceOptions?: EventSourceOnly;
  skipAssert?: boolean;
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
export type SendJsonMessage = (jsonMessage: JsonValue, keep?: boolean) => void;

export type Subscriber<T = WebSocketEventMap['message']> = {
  setLastMessage: (message: T) => void,
  setReadyState: (readyState: ReadyState) => void,
  optionsRef: MutableRefObject<Options>,
  reconnectCount: MutableRefObject<number>,
  reconnect: MutableRefObject<() => void>,
}

export type WebSocketHook<T = JsonValue, P = WebSocketEventMap['message'] | null> = {
  sendMessage: SendMessage,
  sendJsonMessage: SendJsonMessage,
  lastMessage: P,
  lastJsonMessage: T,
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


/**
Matches a [`class`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes).
@category Class
*/
export type Class<T, Arguments extends unknown[] = any[]> = Constructor<T, Arguments> & {prototype: T};

/**
Matches a [`class` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes).
@category Class
*/
export type Constructor<T, Arguments extends unknown[] = any[]> = new(...arguments_: Arguments) => T;

/**
Matches any valid JSON primitive value.
@category JSON
*/
export type JsonPrimitive = string | number | boolean | null;

/**
Matches a JSON object.
This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. Don't use this as a direct return type as the user would have to double-cast it: `jsonObject as unknown as CustomResponse`. Instead, you could extend your CustomResponse type from it to ensure your type only uses JSON-compatible types: `interface CustomResponse extends JsonObject { … }`.
@category JSON
*/
export type JsonObject = {[Key in string]?: JsonValue | JsonPrimitive };

/**
Matches a JSON array.
@category JSON
*/
export type JsonArray = JsonValue[] | JsonPrimitive[];

/**
Matches any valid JSON value.
@see `Jsonify` if you need to transform a type to one that is assignable to `JsonValue`.
@category JSON
*/
export type JsonValue = JsonObject | JsonArray;
