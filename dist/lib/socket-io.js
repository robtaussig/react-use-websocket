"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
exports.parseSocketIOUrl = (url) => {
    if (url) {
        const isSecure = /^https|wss/.test(url);
        const strippedProtocol = url.replace(/^(https?|wss?)(:\/\/)?/, '');
        const removedFinalBackSlack = strippedProtocol.replace(/\/$/, '');
        const protocol = isSecure ? 'wss' : 'ws';
        return `${protocol}://${removedFinalBackSlack}${constants_1.SOCKET_IO_PATH}`;
    }
    else if (url === '') {
        const isSecure = /^https/.test(window.location.protocol);
        const protocol = isSecure ? 'wss' : 'ws';
        const port = window.location.port ? `:${window.location.port}` : '';
        return `${protocol}://${window.location.hostname}${port}${constants_1.SOCKET_IO_PATH}`;
    }
    return url;
};
exports.setUpSocketIOPing = (socketInstance) => {
    const ping = () => socketInstance.send(constants_1.SOCKET_IO_PING_CODE);
    return setInterval(ping, constants_1.SOCKET_IO_PING_INTERVAL);
};
//# sourceMappingURL=socket-io.js.map