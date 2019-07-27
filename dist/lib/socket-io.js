"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var constants_1 = require("./constants");
exports.parseSocketIOUrl = function (url) {
    if (url) {
        var isSecure = /^https|wss/.test(url);
        var strippedProtocol = url.replace(/^(https?|wss?)(:\/\/)?/, '');
        var removedFinalBackSlack = strippedProtocol.replace(/\/$/, '');
        var protocol = isSecure ? 'wss' : 'ws';
        return protocol + "://" + removedFinalBackSlack + constants_1.SOCKET_IO_PATH;
    }
    else if (url === '') {
        var isSecure = /^https/.test(window.location.protocol);
        var protocol = isSecure ? 'wss' : 'ws';
        var port = window.location.port ? ":" + window.location.port : '';
        return protocol + "://" + window.location.hostname + port + constants_1.SOCKET_IO_PATH;
    }
    return url;
};
exports.setUpSocketIOPing = function (socketInstance) {
    var ping = function () { return socketInstance.send(constants_1.SOCKET_IO_PING_CODE); };
    return setInterval(ping, constants_1.SOCKET_IO_PING_INTERVAL);
};
//# sourceMappingURL=socket-io.js.map