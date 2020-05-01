import { MutableRefObject } from 'react';
import { sharedWebSockets } from './globals';
import { Setters } from './attach-listener';
import { Options, Subscriber } from './types';
import { DEFAULT_RECONNECT_LIMIT, DEFAULT_RECONNECT_INTERVAL_MS, ReadyState } from './constants';

export type Subscribers = {
  [url: string]: Subscriber[],
}

const subscribers: Subscribers = {};

export const addSubscriber = (
  webSocketInstance: WebSocket,
  url: string,
  setters: Setters,
  optionsRef: MutableRefObject<Options>,
  reconnect: () => void,
  reconnectCount: MutableRefObject<number>,
  expectClose: MutableRefObject<boolean>,
) => {
  const { setLastMessage, setReadyState } = setters;
  let reconnectTimeout: NodeJS.Timer;

  if (subscribers[url] === undefined) {
    subscribers[url] = [];

    webSocketInstance.onmessage = (message: WebSocketEventMap['message']) => {
      if (typeof optionsRef.current.filter === 'function' && optionsRef.current.filter(message) !== true) {
        return;
      }
      subscribers[url].forEach(subscriber => {        
        subscriber.setLastMessage(message);

        if (subscriber.optionsRef.current.onMessage) {
          subscriber.optionsRef.current.onMessage(message);
        }
      });
    };

    webSocketInstance.onclose = (event: WebSocketEventMap['close']) => {
      subscribers[url].forEach(subscriber => {
        if (expectClose.current === false) {
          subscriber.setReadyState(prev => Object.assign({}, prev, {[url]: ReadyState.CLOSED}));
        }
        if (subscriber.optionsRef.current.onClose) {
          subscriber.optionsRef.current.onClose(event);
        }
      });
      
      sharedWebSockets[url] = undefined;
      const subscribersToReconnect = [...subscribers[url]];
      subscribers[url] = undefined;

      if (optionsRef.current.shouldReconnect && optionsRef.current.shouldReconnect(event)) {
        const reconnectAttempts = optionsRef.current.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT;
        if (reconnectCount.current < reconnectAttempts) {
          if (expectClose.current === false) {
            reconnectTimeout = setTimeout(() => {
              reconnectCount.current++;
              
              subscribersToReconnect.forEach(subscriber => {
                subscriber.reconnect();
              })
            }, optionsRef.current.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
          }
        } else {
          console.error(`Max reconnect attempts of ${reconnectAttempts} exceeded`);
        }
      }
      
    };

    webSocketInstance.onerror = (error: WebSocketEventMap['error']) => {
      subscribers[url].forEach(subscriber => {

        if (subscriber.optionsRef.current.onError) {
          subscriber.optionsRef.current.onError(error);
        }
      });
    };

    webSocketInstance.onopen = (event: WebSocketEventMap['open']) => {
      reconnectCount.current = 0;
      subscribers[url].forEach(subscriber => {
        if (expectClose.current === false) {
          subscriber.setReadyState(prev => Object.assign({}, prev, {[url]: ReadyState.OPEN}));
        }
        if (subscriber.optionsRef.current.onOpen) {
          subscriber.optionsRef.current.onOpen(event);
        }
      });
    };
  } else {
    setReadyState(prev => Object.assign({}, prev, {[url]: sharedWebSockets[url].readyState}));
  }
  const subscriber = {
    setLastMessage,
    setReadyState,
    optionsRef,
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
