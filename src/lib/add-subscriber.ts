import { READY_STATE_OPEN, READY_STATE_CLOSING, READY_STATE_CLOSED } from './constants';
import { sharedWebSockets } from './globals';
import { Setters } from './attach-listener';
import { Message, ReadyStateState, Options } from './use-websocket';

type Subscriber = {
  setLastMessage: (message: Message) => void,
  setReadyState: (callback: (prev: ReadyStateState) => ReadyStateState) => void,
  options: Options,
}

type Subscribers = {
  [url: string]: Subscriber[],
}

const subscribers: Subscribers = {};

export const addSubscriber = (webSocketInstance: any, url: string, setters: Setters, options: Options = {}) => {
  const { setLastMessage, setReadyState } = setters;

  if (subscribers[url] === undefined) {
    subscribers[url] = [];

    webSocketInstance.onmessage = (message: Message) => {
      if (typeof options.filter === 'function' && options.filter(message) !== true) {
        return;
      }
      subscribers[url].forEach(subscriber => {        
        subscriber.setLastMessage(message);

        if (subscriber.options.onMessage) {
          subscriber.options.onMessage(message);
        }
      });
    };

    webSocketInstance.onclose = (event: Event) => {
      subscribers[url].forEach(subscriber => {
        subscriber.setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CLOSED}));
        if (subscriber.options.onClose) {
          subscriber.options.onClose(event);
        }
      });

      subscribers[url] = undefined;
      sharedWebSockets[url] = undefined;
    };

    webSocketInstance.onerror = (error: Error) => {
      subscribers[url].forEach(subscriber => {

        if (subscriber.options.onError) {
          subscriber.options.onError(error);
        }
      });
    };

    webSocketInstance.onopen = (event: Error) => {
      subscribers[url].forEach(subscriber => {
        subscriber.setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_OPEN}));
        if (subscriber.options.onOpen) {
          subscriber.options.onOpen(event);
        }
      });
    };
  } else {
    setReadyState(prev => Object.assign({}, prev, {[url]: sharedWebSockets[url].readyState}));
  }

  const subscriber = {
    setLastMessage,
    setReadyState,
    options,
  };
  subscribers[url].push(subscriber);

  return () => {
    if (subscribers[url] !== undefined) {
      const index = subscribers[url].indexOf(subscriber);
      if (index === -1) {
        throw new Error('A subscriber that is no longer registered has attempted to unsubscribe');
      }
      if (subscribers[url].length === 1) {
        subscribers[url][0].setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CLOSING}));
        webSocketInstance.close();
      } else {
        subscribers[url].splice(index, 1);
      }
    }
  };
};
