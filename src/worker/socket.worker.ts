import { MessageTypes } from './types';

let webSocket: WebSocket;
let processor: (messageData: WebSocketEventMap['message']) => any;

self.onmessage = (mainThreadMessage: any) => {
  switch (mainThreadMessage.data.type as MessageTypes) {
    case MessageTypes.Connect:
      if (webSocket !== undefined) {
        throw new Error('A WebSocket has already been created');
      } else {
        webSocket = new WebSocket(mainThreadMessage.data.payload);

        webSocket.onopen = (message: WebSocketEventMap['open']) => {
          postMessage({
            type: MessageTypes.Connected,
          }, null);
        };
        webSocket.onclose = (closeEvent: WebSocketEventMap['close']) => {
          postMessage({
            type: MessageTypes.Closed,
          }, null);
        };
        webSocket.onerror = (errorEvent: WebSocketEventMap['error']) => {
          postMessage({
            type: MessageTypes.Errored,
            payload: errorEvent,
          }, null);
        };
        webSocket.onmessage = (message: WebSocketEventMap['message']) => {
          if (processor) {
            const processed = processor(message);
            if (processed !== null) {
              postMessage({
                type: MessageTypes.Message,
                payload: processed,
              }, null);
            }
          } else {
            postMessage({
              type: MessageTypes.Message,
              payload: message.data,
            }, null);
          }
        };
      }
      break;

    case MessageTypes.SendMessage:
      if (webSocket === undefined) {
        throw new Error('Cannot send a message until a socket has been created');
      } else {
        webSocket.send(mainThreadMessage.data.payload);
      }
      break;

    case MessageTypes.Close:
      if (webSocket === undefined) {
        throw new Error('Cannot close a socket until it has been created');
      } else {
        webSocket.close();
      }
      break;
  
    case MessageTypes.SetMessageProcessor:
      processor = eval('('+mainThreadMessage.data.payload+')');
      break;

    default:
      throw new Error(`Unexpected message received: ${mainThreadMessage}`);
  }
};
