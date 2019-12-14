import { MutableRefObject } from 'react';
import { sharedWebSockets } from './globals';
import { READY_STATE_CONNECTING } from './constants';
import { ReadyStateState, Options } from './use-websocket';
import WorkerSocket from './worker-socket';

export const createOrJoinSocket = (
  webSocketRef: MutableRefObject<WebSocket | WorkerSocket>,
  url: string,
  setReadyState: (callback: (prev: ReadyStateState) => ReadyStateState) => void,
  options: Options
) => {
  if (options.share) {
    if (sharedWebSockets[url] === undefined) {
      setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CONNECTING}));
      sharedWebSockets[url] = options.workerConfig ? new WorkerSocket(url) : new WebSocket(url);
    }
    webSocketRef.current = sharedWebSockets[url];
  } else {
    setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CONNECTING}));
    webSocketRef.current = options.workerConfig ? new WorkerSocket(url) : new WebSocket(url);
  }
};
