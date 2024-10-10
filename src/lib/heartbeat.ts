import { MutableRefObject } from "react";
import { DEFAULT_HEARTBEAT } from "./constants";
import { HeartbeatOptions } from "./types";

export function heartbeat(ws: WebSocket, lastMessageTime: MutableRefObject<number>, options?: HeartbeatOptions): () => void {
  const {
    interval = DEFAULT_HEARTBEAT.interval,
    timeout = DEFAULT_HEARTBEAT.timeout,
    message = DEFAULT_HEARTBEAT.message,
  } = options || {};

  const heartbeatInterval = setInterval(() => {
    if (lastMessageTime.current + timeout <= Date.now()) {
      console.warn(`Heartbeat timed out, closing connection, last message was seen ${Date.now() - lastMessageTime.current}ms ago`);
      ws.close();
    } else {
      if (lastMessageTime.current + interval <= Date.now()) {
        try {
          if (typeof message === 'function') {
            ws.send(message());
          } else {
            ws.send(message);
          }
        } catch (err: unknown) {
          console.error(`Heartbeat failed, closing connection`, err instanceof Error ? err.message : err);
          ws.close();
        }

      }
    }
  }, interval);

  ws.addEventListener("close", () => {
    clearInterval(heartbeatInterval);
  });


  return () => { };
}
