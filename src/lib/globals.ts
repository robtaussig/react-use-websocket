import WorkerSocket from './worker-socket';

export interface SharedWebSockets {
  [url: string]: WebSocket | WorkerSocket;
}

export const sharedWebSockets: SharedWebSockets = {};
