"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_1 = require("./socket-io");
var constants_1 = require("./constants");
var add_subscriber_1 = require("./add-subscriber");
exports.attachListeners = function (webSocketInstance, url, setters, options, retry, retryCount) {
    var setLastMessage = setters.setLastMessage, setReadyState = setters.setReadyState;
    var interval;
    if (options.fromSocketIO) {
        interval = socket_io_1.setUpSocketIOPing(webSocketInstance);
    }
    if (options.share) {
        var removeSubscriber = add_subscriber_1.addSubscriber(webSocketInstance, url, {
            setLastMessage: setLastMessage,
            setReadyState: setReadyState,
        }, options);
        return removeSubscriber;
    }
    webSocketInstance.onmessage = function (message) {
        options.onMessage && options.onMessage(message);
        if (typeof options.filter === 'function' && options.filter(message) !== true) {
            return;
        }
        setLastMessage(message);
    };
    webSocketInstance.onopen = function (event) {
        options.onOpen && options.onOpen(event);
        retryCount.current = 0;
        setReadyState(function (prev) {
            var _a;
            return Object.assign({}, prev, (_a = {}, _a[url] = constants_1.READY_STATE_OPEN, _a));
        });
    };
    webSocketInstance.onclose = function (event) {
        options.onClose && options.onClose(event);
        setReadyState(function (prev) {
            var _a;
            return Object.assign({}, prev, (_a = {}, _a[url] = constants_1.READY_STATE_CLOSED, _a));
        });
    };
    webSocketInstance.onerror = function (error) {
        options.onError && options.onError(error);
        if (options.retryOnError) {
            if (retryCount.current < constants_1.RETRY_LIMIT) {
                retryCount.current++;
                retry();
            }
        }
    };
    return function () {
        setReadyState(function (prev) {
            var _a;
            return Object.assign({}, prev, (_a = {}, _a[url] = constants_1.READY_STATE_CLOSING, _a));
        });
        webSocketInstance.close();
        if (interval)
            clearInterval(interval);
    };
};
//# sourceMappingURL=attach-listener.js.map