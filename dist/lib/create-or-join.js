"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("./globals");
const constants_1 = require("./constants");
exports.createOrJoinSocket = (webSocketRef, url, setReadyState, options) => {
    if (options.share) {
        if (globals_1.sharedWebSockets[url] === undefined) {
            setReadyState(prev => Object.assign({}, prev, { [url]: constants_1.READY_STATE_CONNECTING }));
            globals_1.sharedWebSockets[url] = new WebSocket(url);
        }
        webSocketRef.current = globals_1.sharedWebSockets[url];
    }
    else {
        setReadyState(prev => Object.assign({}, prev, { [url]: constants_1.READY_STATE_CONNECTING }));
        webSocketRef.current = new WebSocket(url);
    }
};
//# sourceMappingURL=create-or-join.js.map