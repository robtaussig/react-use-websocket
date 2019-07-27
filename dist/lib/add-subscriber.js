"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const globals_1 = require("./globals");
const subscribers = {};
exports.addSubscriber = (webSocketInstance, url, setters, options = {}) => {
    const { setLastMessage, setReadyState } = setters;
    if (subscribers[url] === undefined) {
        subscribers[url] = [];
        webSocketInstance.onmessage = (message) => {
            if (typeof options.filter === 'function' && options.filter(message) !== true) {
                return;
            }
            subscribers[url].forEach(subscriber => {
                subscriber.setLastMessage(message);
                if (subscriber.options.onMessage) {
                    subscriber.options.onMessage(message);
                }
            });
        };
        webSocketInstance.onclose = (event) => {
            subscribers[url].forEach(subscriber => {
                subscriber.setReadyState(prev => Object.assign({}, prev, { [url]: constants_1.READY_STATE_CLOSED }));
                if (subscriber.options.onClose) {
                    subscriber.options.onClose(event);
                }
            });
            subscribers[url] = undefined;
            globals_1.sharedWebSockets[url] = undefined;
        };
        webSocketInstance.onerror = (error) => {
            subscribers[url].forEach(subscriber => {
                if (subscriber.options.onError) {
                    subscriber.options.onError(error);
                }
            });
        };
        webSocketInstance.onopen = (event) => {
            subscribers[url].forEach(subscriber => {
                subscriber.setReadyState(prev => Object.assign({}, prev, { [url]: constants_1.READY_STATE_OPEN }));
                if (subscriber.options.onOpen) {
                    subscriber.options.onOpen(event);
                }
            });
        };
    }
    else {
        setReadyState(prev => Object.assign({}, prev, { [url]: globals_1.sharedWebSockets[url].readyState }));
    }
    const subscriber = {
        setLastMessage,
        setReadyState,
        options,
    };
    subscribers[url].push(subscriber);
    return () => {
        if (subscribers[url] !== undefined) {
            const index = subscribers[url].indexOf(subscriber);
            if (index === -1) {
                throw new Error('A subscriber that is no longer registered has attempted to unsubscribe');
            }
            if (subscribers[url].length === 1) {
                subscribers[url][0].setReadyState(prev => Object.assign({}, prev, { [url]: constants_1.READY_STATE_CLOSING }));
                webSocketInstance.close();
            }
            else {
                subscribers[url].splice(index, 1);
            }
        }
    };
};
//# sourceMappingURL=add-subscriber.js.map