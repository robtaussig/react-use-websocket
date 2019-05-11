"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createOrJoinSocket = void 0;

var _globals = require("./globals");

var _constants = require("./constants");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var createOrJoinSocket = function createOrJoinSocket(webSocketRef, url, setReadyState, options) {
  if (options.share) {
    if (_globals.sharedWebSockets[url] === undefined) {
      setReadyState(function (prev) {
        return Object.assign({}, prev, _defineProperty({}, url, _constants.READY_STATE_CONNECTING));
      });
      _globals.sharedWebSockets[url] = new WebSocket(url);
    }

    webSocketRef.current = _globals.sharedWebSockets[url];
  } else {
    setReadyState(function (prev) {
      return Object.assign({}, prev, _defineProperty({}, url, _constants.READY_STATE_CONNECTING));
    });
    webSocketRef.current = new WebSocket(url);
  }
};

exports.createOrJoinSocket = createOrJoinSocket;