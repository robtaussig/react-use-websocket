import { WebSocketLike } from './types.js';
import { resetWebSockets } from './globals.js';
import { resetSubscribers } from './manage-subscribers.js';

export function assertIsWebSocket (
    webSocketInstance: WebSocketLike,
    skip?: boolean,
): asserts webSocketInstance is WebSocket {
    if (!skip && webSocketInstance instanceof WebSocket === false) throw new Error('');
};


export function resetGlobalState (url?: string): void {
    resetSubscribers(url);
    resetWebSockets(url);
};
