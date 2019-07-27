"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var constants_1 = require("./constants");
var globals_1 = require("./globals");
var subscribers = {};
exports.addSubscriber = function (webSocketInstance, url, setters, options) {
    if (options === void 0) { options = {}; }
    var setLastMessage = setters.setLastMessage, setReadyState = setters.setReadyState;
    if (subscribers[url] === undefined) {
        subscribers[url] = [];
        webSocketInstance.onmessage = function (message) {
            if (typeof options.filter === 'function' && options.filter(message) !== true) {
                return;
            }
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
                    var _a;
                    return Object.assign({}, prev, (_a = {}, _a[url] = constants_1.READY_STATE_CLOSED, _a));
                });
                if (subscriber.options.onClose) {
                    subscriber.options.onClose(event);
                }
            });
            subscribers[url] = undefined;
            globals_1.sharedWebSockets[url] = undefined;
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
                    var _a;
                    return Object.assign({}, prev, (_a = {}, _a[url] = constants_1.READY_STATE_OPEN, _a));
                });
                if (subscriber.options.onOpen) {
                    subscriber.options.onOpen(event);
                }
            });
        };
    }
    else {
        setReadyState(function (prev) {
            var _a;
            return Object.assign({}, prev, (_a = {}, _a[url] = globals_1.sharedWebSockets[url].readyState, _a));
        });
    }
    var subscriber = {
        setLastMessage: setLastMessage,
        setReadyState: setReadyState,
        options: options,
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
                    var _a;
                    return Object.assign({}, prev, (_a = {}, _a[url] = constants_1.READY_STATE_CLOSING, _a));
                });
                webSocketInstance.close();
            }
            else {
                subscribers[url].splice(index, 1);
            }
        }
    };
};
//# sourceMappingURL=add-subscriber.js.map