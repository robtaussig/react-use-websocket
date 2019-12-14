import { MessageTypes } from '../worker/types';
import {
  READY_STATE_CONNECTING,
  READY_STATE_OPEN,
  READY_STATE_CLOSING,
  READY_STATE_CLOSED,
} from './constants';

export default class WorkerSocket {
  worker: Worker;
  readyState: number = READY_STATE_CONNECTING;

  constructor(
    readonly url: string,
    processMessage?: (messageData: WebSocketEventMap['message']) => any,
  ) {
    this.worker = new Worker('../worker/socket.worker.ts');
    this.worker.addEventListener('message', this.handleMessage);
    if (processMessage !== undefined) {
      this.worker.postMessage({
        type: MessageTypes.SetMessageProcessor,
        payload: processMessage.toString(),
      });
    }
    this.worker.postMessage({
      type: MessageTypes.Connect,
      payload: url,
    });
  }

  handleMessage = (message: WorkerEventMap['message']) => {
    switch (message.data.type as MessageTypes) {

      case MessageTypes.Connected:
        this.readyState = READY_STATE_OPEN;
        this.onopen();
        break;

      case MessageTypes.Closed:
        this.readyState = READY_STATE_CLOSED;
        this.onclose();
        break;

      case MessageTypes.Errored:
        this.onerror();
        break;

      case MessageTypes.Message:
        this.onmessage(message.data.payload);
        break;
    
      default:
        throw new Error('Unexpected message received');
    }
  }

  public onmessage = (messagePayload: any) => {
    throw new Error('This must be set before receiving messages');
  }

  public onclose = () => {
    throw new Error('This must be set');
  }

  public onerror = () => {
    throw new Error('This must be set');
  }

  public onopen = () => {
    throw new Error('This must be set');
  }

  public send = (message: string) => {
    this.worker.postMessage({
      type: MessageTypes.SendMessage,
      payload: message,
    });
  }

  public close = () => {
    this.readyState = READY_STATE_CLOSING;
    this.worker.postMessage({
      type: MessageTypes.Close,
    });
  }
}
