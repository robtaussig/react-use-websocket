import { useWebSocket } from './lib/use-websocket';

export { useSocketIO } from './lib/use-socket-io';

export enum ReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export default useWebSocket;
