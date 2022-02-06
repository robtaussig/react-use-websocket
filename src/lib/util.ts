import { WebSocketLike } from './types';
import { resetWebSockets } from './globals';
import { resetSubscribers } from './manage-subscribers';

export function assertIsWebSocket (
    webSocketInstance: WebSocketLike,
): asserts webSocketInstance is WebSocket {
    if (webSocketInstance instanceof WebSocket === false) throw new Error('');
};


export function resetGlobalState (url?: string): void {
    resetSubscribers(url);
    resetWebSockets(url);
};
