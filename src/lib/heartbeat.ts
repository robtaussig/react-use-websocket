import { DEFAULT_HEARTBEAT } from "./constants";
import { HeartbeatOptions } from "./types";

export function heartbeat(ws: WebSocket, options?: HeartbeatOptions): void {
  const {
    interval = DEFAULT_HEARTBEAT.interval,
    timeout = DEFAULT_HEARTBEAT.timeout,
    kind = DEFAULT_HEARTBEAT.kind,
  } = options || {};

  let messageAccepted = false;

  ws.addEventListener("message", () => {
    messageAccepted = true;
  });

  const pingTimer = setInterval(() => {
    try {
      ws.send(kind);
    } catch (error) {
      // do nothing
    }
  }, interval);

  const timeoutTimer = setInterval(() => {
    if (!messageAccepted) {
      ws.close();
    } else {
      messageAccepted = false;
    }
  }, timeout);

  ws.addEventListener("close", () => {
    clearInterval(pingTimer);
    clearInterval(timeoutTimer);
  });
}
