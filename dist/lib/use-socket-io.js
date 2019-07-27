"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const use_websocket_1 = require("./use-websocket");
const constants_1 = require("./constants");
const emptyEvent = {
    type: 'empty',
    payload: null,
};
const getSocketData = (event) => {
    if (!event || !event.data) {
        return emptyEvent;
    }
    const match = event.data.match(/\[.*]/);
    if (!match) {
        return emptyEvent;
    }
    const data = JSON.parse(match);
    if (!Array.isArray(data) || !data[1]) {
        return emptyEvent;
    }
    return {
        type: data[0],
        payload: data[1],
    };
};
exports.useSocketIO = (url, options = constants_1.DEFAULT_OPTIONS) => {
    const optionsWithSocketIO = react_1.useMemo(() => (Object.assign({}, options, { fromSocketIO: true })), []);
    const [sendMessage, lastMessage, readyStateFromUrl] = use_websocket_1.useWebSocket(url, optionsWithSocketIO);
    return [
        sendMessage,
        react_1.useMemo(() => getSocketData(lastMessage), [lastMessage]),
        readyStateFromUrl,
    ];
};
//# sourceMappingURL=use-socket-io.js.map