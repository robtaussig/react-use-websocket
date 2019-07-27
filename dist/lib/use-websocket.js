"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const socket_io_1 = require("./socket-io");
const attach_listener_1 = require("./attach-listener");
const constants_1 = require("./constants");
const create_or_join_1 = require("./create-or-join");
var ReadyStateEnum;
(function (ReadyStateEnum) {
    ReadyStateEnum[ReadyStateEnum["Connecting"] = 0] = "Connecting";
    ReadyStateEnum[ReadyStateEnum["Open"] = 1] = "Open";
    ReadyStateEnum[ReadyStateEnum["Closing"] = 2] = "Closing";
    ReadyStateEnum[ReadyStateEnum["Closed"] = 3] = "Closed";
})(ReadyStateEnum = exports.ReadyStateEnum || (exports.ReadyStateEnum = {}));
exports.useWebSocket = (url, options = constants_1.DEFAULT_OPTIONS) => {
    const [lastMessage, setLastMessage] = react_1.useState(null);
    const [readyState, setReadyState] = react_1.useState({});
    const webSocketRef = react_1.useRef(null);
    const retryCount = react_1.useRef(0);
    const staticOptionsCheck = react_1.useRef(null);
    const convertedUrl = react_1.useMemo(() => {
        if (options.fromSocketIO) {
            return socket_io_1.parseSocketIOUrl(url);
        }
        return url;
    }, [url]);
    const sendMessage = react_1.useCallback((message) => {
        webSocketRef.current && webSocketRef.current.send(message);
    }, []);
    react_1.useEffect(() => {
        let removeListeners;
        const start = () => {
            create_or_join_1.createOrJoinSocket(webSocketRef, convertedUrl, setReadyState, options);
            removeListeners = attach_listener_1.attachListeners(webSocketRef.current, convertedUrl, {
                setLastMessage,
                setReadyState,
            }, options, start, retryCount);
        };
        start();
        return removeListeners;
    }, [convertedUrl]);
    react_1.useEffect(() => {
        if (staticOptionsCheck.current)
            throw new Error('The options object you pass must be static');
        staticOptionsCheck.current = true;
    }, [options]);
    const readyStateFromUrl = readyState[convertedUrl] !== undefined ? readyState[convertedUrl] : constants_1.READY_STATE_CONNECTING;
    return [sendMessage, lastMessage, readyStateFromUrl];
};
//# sourceMappingURL=use-websocket.js.map