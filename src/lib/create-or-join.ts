import { sharedWebSockets } from './globals';
import { READY_STATE_CONNECTING } from './constants';
import { ReadyStateState, Options } from './use-websocket';

declare global {
  class WebSocket {
    constructor(url: string)
  }
}

export const createOrJoinSocket = (webSocketRef: any, url: string, setReadyState: (callback: (prev: ReadyStateState) => ReadyStateState) => void, options: Options) => {
  if (options.share) {
    if (sharedWebSockets[url] === undefined) {
      setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CONNECTING}));
      sharedWebSockets[url] = new WebSocket(url);
    }
    webSocketRef.current = sharedWebSockets[url];
  } else {
    setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CONNECTING}));
    webSocketRef.current = new WebSocket(url);
  }
};
