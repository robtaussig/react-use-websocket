import { sharedWebSockets } from './globals';
import { READY_STATE_CONNECTING } from './constants';

export const createOrJoinSocket = (webSocketRef, url, setReadyState, options) => {
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
