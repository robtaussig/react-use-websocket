// Type definitions for react-use-websocket
// Project: useWebSocket
// Definitions by: Robert Taussig <robtaussig.com>

export interface Options {
  fromSocketIO?: boolean;
  onMessage?(message: MessageEvent): void;
  onClose?(event: CloseEvent): void;
  onError?(error: ErrorEvent): void;
  onOpen?(event: Event): void;
  share?: boolean;
}

enum ReadyState {
  READY_STATE_CONNECTING = 0,
  READY_STATE_OPEN = 1,
  READY_STATE_CLOSING = 2,
  READY_STATE_CLOSED = 3,
}

export default function useWebSocket(url: string, options?: Options): [(message: any) => void, MessageEvent, ReadyState];
