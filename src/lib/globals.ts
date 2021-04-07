import { WebSocketLike } from "./types";

export interface SharedWebSockets {
  [url: string]: WebSocketLike;
}

export const sharedWebSockets: SharedWebSockets = {};
