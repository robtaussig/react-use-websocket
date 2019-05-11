"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.useWebSocket = void 0;

var _react = require("react");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var sharedWebSockets = {};
var subscribers = {};
var DEFAULT_OPTIONS = {};
var READY_STATE_CONNECTING = 0;
var READY_STATE_OPEN = 1;
var READY_STATE_CLOSING = 2;
var READY_STATE_CLOSED = 3;
var RETRY_LIMIT = 2;

var attachListeners = function attachListeners(webSocketInstance, url, setters, options, retry, retryCount) {
  var setLastMessage = setters.setLastMessage,
      setReadyState = setters.setReadyState;
  var interval;

  if (options.fromSocketIO) {
    interval = setUpSocketIOPing(webSocketInstance);
  }

  if (options.share) {
    var removeSubscriber = addSubscriber(webSocketInstance, url, {
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
      return Object.assign({}, prev, _defineProperty({}, url, READY_STATE_OPEN));
    });
  };

  webSocketInstance.onclose = function (event) {
    options.onClose && options.onClose(event);
    setReadyState(function (prev) {
      return Object.assign({}, prev, _defineProperty({}, url, READY_STATE_CLOSED));
    });
  };

  webSocketInstance.onerror = function (error) {
    options.onError && options.onError(error);

    if (options.retryOnError) {
      if (retryCount.current < RETRY_LIMIT) {
        retryCount.current++;
        retry();
      }
    }
  };

  return function () {
    setReadyState(function (prev) {
      return Object.assign({}, prev, _defineProperty({}, url, READY_STATE_CLOSING));
    });
    webSocketInstance.close();
    if (interval) clearInterval(interval);
  };
};

var createOrJoinSocket = function createOrJoinSocket(webSocketRef, url, setReadyState, options) {
  if (options.share) {
    if (sharedWebSockets[url] === undefined) {
      setReadyState(function (prev) {
        return Object.assign({}, prev, _defineProperty({}, url, READY_STATE_CONNECTING));
      });
      sharedWebSockets[url] = new WebSocket(url);
    }

    webSocketRef.current = sharedWebSockets[url];
  } else {
    setReadyState(function (prev) {
      return Object.assign({}, prev, _defineProperty({}, url, READY_STATE_CONNECTING));
    });
    webSocketRef.current = new WebSocket(url);
  }
};

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
          return Object.assign({}, prev, _defineProperty({}, url, READY_STATE_CLOSED));
        });

        if (subscriber.options.onClose) {
          subscriber.options.onClose(event);
        }
      });
      subscribers[url] = undefined;
      sharedWebSockets[url] = undefined;
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
          return Object.assign({}, prev, _defineProperty({}, url, READY_STATE_OPEN));
        });

        if (subscriber.options.onOpen) {
          subscriber.options.onOpen(event);
        }
      });
    };
  } else {
    setReadyState(function (prev) {
      return Object.assign({}, prev, _defineProperty({}, url, sharedWebSockets[url].readyState));
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
          return Object.assign({}, prev, _defineProperty({}, url, READY_STATE_CLOSING));
        });
        webSocketInstance.close();
      } else {
        subscribers[url].splice(index, 1);
      }
    }
  };
};

var parseSocketIOUrl = function parseSocketIOUrl(url) {
  if (url) {
    var isSecure = /^https|ws/.test(url);
    var strippedProtocol = url.replace(/^(https?|wss?)(:\/\/)?/, '');
    var removedFinalBackSlack = strippedProtocol.replace(/\/$/, '');
    var protocol = isSecure ? 'wss' : 'ws';
    return "".concat(protocol, "://").concat(removedFinalBackSlack, "/socket.io/?EIO=3&transport=websocket");
  } else if (url === '') {
    console.warn('If no url is provided for a socketIO connection, the default is to use the same host and port that serves the page');

    var _isSecure = /^https/.test(window.location.protocol);

    var _protocol = _isSecure ? 'wss' : 'ws';

    var port = window.location.port ? ":".concat(window.location.port) : '';
    return "".concat(_protocol, "://").concat(window.location.hostname).concat(port, "/socket.io/?EIO=3&transport=websocket");
  }

  return url;
};

var setUpSocketIOPing = function setUpSocketIOPing(socketInstance) {
  var ping = function ping() {
    return socketInstance.send(2);
  };

  return setInterval(ping, 25000);
};

var useWebSocket = function useWebSocket(url) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT_OPTIONS;
  var webSocketRef = (0, _react.useRef)(null);
  var retryCount = (0, _react.useRef)(0);
  var convertedUrl = (0, _react.useMemo)(function () {
    if (options.fromSocketIO) {
      return parseSocketIOUrl(url);
    }

    return url;
  }, [url]);

  var _useState = (0, _react.useState)(null),
      _useState2 = _slicedToArray(_useState, 2),
      lastMessage = _useState2[0],
      setLastMessage = _useState2[1];

  var _useState3 = (0, _react.useState)({}),
      _useState4 = _slicedToArray(_useState3, 2),
      readyState = _useState4[0],
      setReadyState = _useState4[1];

  var staticOptionsCheck = (0, _react.useRef)(null);
  var sendMessage = (0, _react.useCallback)(function (message) {
    webSocketRef.current && webSocketRef.current.send(message);
  }, []);
  (0, _react.useEffect)(function () {
    var removeListeners;

    var start = function start() {
      createOrJoinSocket(webSocketRef, convertedUrl, setReadyState, options);
      removeListeners = attachListeners(webSocketRef.current, convertedUrl, {
        setLastMessage: setLastMessage,
        setReadyState: setReadyState
      }, options, start, retryCount);
    };

    start();
    return removeListeners;
  }, [convertedUrl]);
  (0, _react.useEffect)(function () {
    if (staticOptionsCheck.current) throw new Error('The options object you pass must be static');
    staticOptionsCheck.current = true;
  }, [options]);
  var readyStateFromUrl = readyState[convertedUrl] !== undefined ? readyState[convertedUrl] : READY_STATE_CONNECTING;
  return [sendMessage, lastMessage, readyStateFromUrl];
};

exports.useWebSocket = useWebSocket;
var _default = useWebSocket;
exports["default"] = _default;