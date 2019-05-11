"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addSubscriber = void 0;

var _constants = require("./constants");

var _globals = require("./globals");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var subscribers = {};

var addSubscriber = function addSubscriber(webSocketInstance, url, setters) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var setLastMessage = setters.setLastMessage,
      setReadyState = setters.setReadyState;

  if (subscribers[url] === undefined) {
    subscribers[url] = [];

    webSocketInstance.onmessage = function (message) {
      subscribers[url].forEach(function (subscriber) {
        subscriber.setLastMessage(message);

        if (subscriber.options.onMessage) {
          subscriber.options.onMessage(message);
        }
      });
    };

    webSocketInstance.onclose = function (event) {
      subscribers[url].forEach(function (subscriber) {
        subscriber.setReadyState(function (prev) {
          return Object.assign({}, prev, _defineProperty({}, url, _constants.READY_STATE_CLOSED));
        });

        if (subscriber.options.onClose) {
          subscriber.options.onClose(event);
        }
      });
      subscribers[url] = undefined;
      _globals.sharedWebSockets[url] = undefined;
    };

    webSocketInstance.onerror = function (error) {
      subscribers[url].forEach(function (subscriber) {
        if (subscriber.options.onError) {
          subscriber.options.onError(error);
        }
      });
    };

    webSocketInstance.onopen = function (event) {
      subscribers[url].forEach(function (subscriber) {
        subscriber.setReadyState(function (prev) {
          return Object.assign({}, prev, _defineProperty({}, url, _constants.READY_STATE_OPEN));
        });

        if (subscriber.options.onOpen) {
          subscriber.options.onOpen(event);
        }
      });
    };
  } else {
    setReadyState(function (prev) {
      return Object.assign({}, prev, _defineProperty({}, url, _globals.sharedWebSockets[url].readyState));
    });
  }

  var subscriber = {
    setLastMessage: setLastMessage,
    setReadyState: setReadyState,
    options: options
  };
  subscribers[url].push(subscriber);
  return function () {
    if (subscribers[url] !== undefined) {
      var index = subscribers[url].indexOf(subscriber);

      if (index === -1) {
        throw new Error('A subscriber that is no longer registered has attempted to unsubscribe');
      }

      if (subscribers[url].length === 1) {
        subscribers[url][0].setReadyState(function (prev) {
          return Object.assign({}, prev, _defineProperty({}, url, _constants.READY_STATE_CLOSING));
        });
        webSocketInstance.close();
      } else {
        subscribers[url].splice(index, 1);
      }
    }
  };
};

exports.addSubscriber = addSubscriber;