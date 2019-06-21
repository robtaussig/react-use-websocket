"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "useSocketIO", {
  enumerable: true,
  get: function get() {
    return _useSocketIo.useSocketIO;
  }
});
exports["default"] = void 0;

var _useWebsocket = require("./lib/use-websocket");

var _useSocketIo = require("./lib/use-socket-io");

var _default = _useWebsocket.useWebSocket;
exports["default"] = _default;