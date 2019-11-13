const MILLISECONDS = 1;
const SECONDS = 1000 * MILLISECONDS;

export const sharedWebSockets = {};
export const DEFAULT_OPTIONS = {};
export const READY_STATE_CONNECTING = 0;
export const READY_STATE_OPEN = 1;
export const READY_STATE_CLOSING = 2;
export const READY_STATE_CLOSED = 3;
export const SOCKET_IO_PING_INTERVAL = 25 * SECONDS;
export const SOCKET_IO_PATH = '/socket.io/?EIO=3&transport=websocket';
export const SOCKET_IO_PING_CODE = '2';
export const DEFAULT_RECONNECT_LIMIT = 20;
export const DEFAULT_RECONNECT_INTERVAL_MS = 5000;