import { useWebSocket } from './lib/use-websocket';
import {
  READY_STATE_CONNECTING,
  READY_STATE_OPEN,
  READY_STATE_CLOSING,
  READY_STATE_CLOSED,
} from './lib/constants';

export { useSocketIO } from './lib/use-socket-io';

export enum ReadyState {
  CONNECTING = READY_STATE_CONNECTING,
  OPEN = READY_STATE_OPEN,
  CLOSING = READY_STATE_CLOSING,
  CLOSED = READY_STATE_CLOSED,
}

export default useWebSocket;
