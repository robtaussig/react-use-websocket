"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("./socket-io");
const constants_1 = require("./constants");
const add_subscriber_1 = require("./add-subscriber");
exports.attachListeners = (webSocketInstance, url, setters, options, retry, retryCount) => {
    const { setLastMessage, setReadyState } = setters;
    let interval;
    if (options.fromSocketIO) {
        interval = socket_io_1.setUpSocketIOPing(webSocketInstance);
    }
    if (options.share) {
        const removeSubscriber = add_subscriber_1.addSubscriber(webSocketInstance, url, {
            setLastMessage,
            setReadyState,
        }, options);
        return removeSubscriber;
    }
    webSocketInstance.onmessage = (message) => {
        options.onMessage && options.onMessage(message);
        if (typeof options.filter === 'function' && options.filter(message) !== true) {
            return;
        }
        setLastMessage(message);
    };
    webSocketInstance.onopen = (event) => {
        options.onOpen && options.onOpen(event);
        retryCount.current = 0;
        setReadyState(prev => Object.assign({}, prev, { [url]: constants_1.READY_STATE_OPEN }));
    };
    webSocketInstance.onclose = (event) => {
        options.onClose && options.onClose(event);
        setReadyState(prev => Object.assign({}, prev, { [url]: constants_1.READY_STATE_CLOSED }));
    };
    webSocketInstance.onerror = (error) => {
        options.onError && options.onError(error);
        if (options.retryOnError) {
            if (retryCount.current < constants_1.RETRY_LIMIT) {
                retryCount.current++;
                retry();
            }
        }
    };
    return () => {
        setReadyState(prev => Object.assign({}, prev, { [url]: constants_1.READY_STATE_CLOSING }));
        webSocketInstance.close();
        if (interval)
            clearInterval(interval);
    };
};
//# sourceMappingURL=attach-listener.js.map