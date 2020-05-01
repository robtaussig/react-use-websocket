import { MutableRefObject } from 'react';
import { sharedWebSockets } from './globals';
import { Setters } from './attach-listener';
import { Options, SendMessage, Subscriber } from './types';
import { DEFAULT_RECONNECT_LIMIT, DEFAULT_RECONNECT_INTERVAL_MS, ReadyState } from './constants';

export type Subscribers = {
  [url: string]: Subscriber[],
}

const subscribers: Subscribers = {};

export const addSubscriber = (
  webSocketInstance: WebSocket,
  url: string,
  setters: Setters,
  options: Options = {},
  reconnect: () => void,
  reconnectCount: MutableRefObject<number>,
  expectClose: MutableRefObject<boolean>,
) => {
  const { setLastMessage, setReadyState } = setters;
  let reconnectTimeout: NodeJS.Timer;

  if (subscribers[url] === undefined) {
    subscribers[url] = [];

    webSocketInstance.onmessage = (message: WebSocketEventMap['message']) => {
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

    webSocketInstance.onclose = (event: WebSocketEventMap['close']) => {
      subscribers[url].forEach(subscriber => {
        if (expectClose.current === false) {
          subscriber.setReadyState(prev => Object.assign({}, prev, {[url]: ReadyState.CLOSED}));
        }
        if (subscriber.options.onClose) {
          subscriber.options.onClose(event);
        }
      });
      
      sharedWebSockets[url] = undefined;
      const subscribersToReconnect = [...subscribers[url]];
      subscribers[url] = undefined;

      if (options.shouldReconnect && options.shouldReconnect(event)) {
        const reconnectAttempts = options.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT;
        if (reconnectCount.current < reconnectAttempts) {
          if (expectClose.current === false) {
            reconnectTimeout = setTimeout(() => {
              reconnectCount.current++;
              
              subscribersToReconnect.forEach(subscriber => {
                subscriber.reconnect();
              })
            }, options.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
          }
        } else {
          console.error(`Max reconnect attempts of ${reconnectAttempts} exceeded`);
        }
      }
      
    };

    webSocketInstance.onerror = (error: WebSocketEventMap['error']) => {
      subscribers[url].forEach(subscriber => {

        if (subscriber.options.onError) {
          subscriber.options.onError(error);
        }
      });
    };

    webSocketInstance.onopen = (event: WebSocketEventMap['open']) => {
      reconnectCount.current = 0;
      subscribers[url].forEach(subscriber => {
        if (expectClose.current === false) {
          subscriber.setReadyState(prev => Object.assign({}, prev, {[url]: ReadyState.OPEN}));
        }
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
    reconnect,
  };

  subscribers[url].push(subscriber);

  return () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
  
    if (subscribers[url] !== undefined) {
      const index = subscribers[url].indexOf(subscriber);
      if (index === -1) {
        throw new Error('A subscriber that is no longer registered has attempted to unsubscribe');
      }
      if (subscribers[url].length === 1) {
        subscribers[url][0].setReadyState(prev => Object.assign({}, prev, {[url]: ReadyState.CLOSING}));
        webSocketInstance.close();
      } else {
        subscribers[url].splice(index, 1);
      }
    }
  };
};
