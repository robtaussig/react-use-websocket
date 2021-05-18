import { WebSocketLike } from './types';

export function assertIsWebSocket (
    webSocketInstance: WebSocketLike,
): asserts webSocketInstance is WebSocket {
    if (webSocketInstance instanceof WebSocket === false) throw new Error('');
};
