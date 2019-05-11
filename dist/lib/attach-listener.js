"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.attachListeners = void 0;

var _socketIo = require("./socket-io");

var _constants = require("./constants");

var _addSubscriber = require("./add-subscriber");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var attachListeners = function attachListeners(webSocketInstance, url, setters, options, retry, retryCount) {
  var setLastMessage = setters.setLastMessage,
      setReadyState = setters.setReadyState;
  var interval;

  if (options.fromSocketIO) {
    interval = (0, _socketIo.setUpSocketIOPing)(webSocketInstance);
  }

  if (options.share) {
    var removeSubscriber = (0, _addSubscriber.addSubscriber)(webSocketInstance, url, {
      setLastMessage: setLastMessage,
      setReadyState: setReadyState
    }, options);
    return removeSubscriber;
  }

  webSocketInstance.onmessage = function (message) {
    options.onMessage && options.onMessage(message);
    setLastMessage(message);
  };

  webSocketInstance.onopen = function (event) {
    options.onOpen && options.onOpen(event);
    retryCount.current = 0;
    setReadyState(function (prev) {
      return Object.assign({}, prev, _defineProperty({}, url, _constants.READY_STATE_OPEN));
    });
  };

  webSocketInstance.onclose = function (event) {
    options.onClose && options.onClose(event);
    setReadyState(function (prev) {
      return Object.assign({}, prev, _defineProperty({}, url, _constants.READY_STATE_CLOSED));
    });
  };

  webSocketInstance.onerror = function (error) {
    options.onError && options.onError(error);

    if (options.retryOnError) {
      if (retryCount.current < _constants.RETRY_LIMIT) {
        retryCount.current++;
        retry();
      }
    }
  };

  return function () {
    setReadyState(function (prev) {
      return Object.assign({}, prev, _defineProperty({}, url, _constants.READY_STATE_CLOSING));
    });
    webSocketInstance.close();
    if (interval) clearInterval(interval);
  };
};

exports.attachListeners = attachListeners;