export interface SharedWebSockets {
  [url: string]: WebSocket;
}

export const sharedWebSockets: SharedWebSockets = {};
