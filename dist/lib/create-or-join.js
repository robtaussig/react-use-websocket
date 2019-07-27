"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("./globals");
var constants_1 = require("./constants");
exports.createOrJoinSocket = function (webSocketRef, url, setReadyState, options) {
    if (options.share) {
        if (globals_1.sharedWebSockets[url] === undefined) {
            setReadyState(function (prev) {
                var _a;
                return Object.assign({}, prev, (_a = {}, _a[url] = constants_1.READY_STATE_CONNECTING, _a));
            });
            globals_1.sharedWebSockets[url] = new WebSocket(url);
        }
        webSocketRef.current = globals_1.sharedWebSockets[url];
    }
    else {
        setReadyState(function (prev) {
            var _a;
            return Object.assign({}, prev, (_a = {}, _a[url] = constants_1.READY_STATE_CONNECTING, _a));
        });
        webSocketRef.current = new WebSocket(url);
    }
};
//# sourceMappingURL=create-or-join.js.map