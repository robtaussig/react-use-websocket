"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setUpSocketIOPing = exports.parseSocketIOUrl = void 0;

var _constants = require("./constants");

var parseSocketIOUrl = function parseSocketIOUrl(url) {
  if (url) {
    var isSecure = /^https|wss/.test(url);
    var strippedProtocol = url.replace(/^(https?|wss?)(:\/\/)?/, '');
    var removedFinalBackSlack = strippedProtocol.replace(/\/$/, '');
    var protocol = isSecure ? 'wss' : 'ws';
    return "".concat(protocol, "://").concat(removedFinalBackSlack).concat(_constants.SOCKET_IO_PATH);
  } else if (url === '') {
    var _isSecure = /^https/.test(window.location.protocol);

    var _protocol = _isSecure ? 'wss' : 'ws';

    var port = window.location.port ? ":".concat(window.location.port) : '';
    return "".concat(_protocol, "://").concat(window.location.hostname).concat(port).concat(_constants.SOCKET_IO_PATH);
  }

  return url;
};

exports.parseSocketIOUrl = parseSocketIOUrl;

var setUpSocketIOPing = function setUpSocketIOPing(socketInstance) {
  var ping = function ping() {
    return socketInstance.send(_constants.SOCKET_IO_PING_CODE);
  };

  return setInterval(ping, _constants.SOCKET_IO_PING_INTERVAL);
};

exports.setUpSocketIOPing = setUpSocketIOPing;