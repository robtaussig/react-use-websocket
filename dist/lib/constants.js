"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MILLISECONDS = 1;
var SECONDS = 1000 * MILLISECONDS;
exports.sharedWebSockets = {};
exports.DEFAULT_OPTIONS = {};
exports.READY_STATE_CONNECTING = 0;
exports.READY_STATE_OPEN = 1;
exports.READY_STATE_CLOSING = 2;
exports.READY_STATE_CLOSED = 3;
exports.SOCKET_IO_PING_INTERVAL = 25 * SECONDS;
exports.SOCKET_IO_PATH = '/socket.io/?EIO=3&transport=websocket';
exports.SOCKET_IO_PING_CODE = 2;
exports.RETRY_LIMIT = 2;
//# sourceMappingURL=constants.js.map