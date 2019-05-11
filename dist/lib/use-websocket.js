"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useWebSocket = void 0;

var _react = require("react");

var _socketIo = require("./socket-io");

var _attachListener = require("./attach-listener");

var _constants = require("./constants");

var _createOrJoin = require("./create-or-join");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var useWebSocket = function useWebSocket(url) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _constants.DEFAULT_OPTIONS;

  var _useState = (0, _react.useState)(null),
      _useState2 = _slicedToArray(_useState, 2),
      lastMessage = _useState2[0],
      setLastMessage = _useState2[1];

  var _useState3 = (0, _react.useState)({}),
      _useState4 = _slicedToArray(_useState3, 2),
      readyState = _useState4[0],
      setReadyState = _useState4[1];

  var webSocketRef = (0, _react.useRef)(null);
  var retryCount = (0, _react.useRef)(0);
  var staticOptionsCheck = (0, _react.useRef)(null);
  var convertedUrl = (0, _react.useMemo)(function () {
    if (options.fromSocketIO) {
      return (0, _socketIo.parseSocketIOUrl)(url);
    }

    return url;
  }, [url]);
  var sendMessage = (0, _react.useCallback)(function (message) {
    webSocketRef.current && webSocketRef.current.send(message);
  }, []);
  (0, _react.useEffect)(function () {
    var removeListeners;

    var start = function start() {
      (0, _createOrJoin.createOrJoinSocket)(webSocketRef, convertedUrl, setReadyState, options);
      removeListeners = (0, _attachListener.attachListeners)(webSocketRef.current, convertedUrl, {
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
  var readyStateFromUrl = readyState[convertedUrl] !== undefined ? readyState[convertedUrl] : _constants.READY_STATE_CONNECTING;
  return [sendMessage, lastMessage, readyStateFromUrl];
};

exports.useWebSocket = useWebSocket;