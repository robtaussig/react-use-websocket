import { MutableRefObject } from 'react';
import { sharedWebSockets } from './globals';
import { Options } from './types';
import { ReadyState } from './constants';
import { attachListeners } from './attach-listener';
import { attachSharedListeners } from './attach-shared-listeners';
import { addSubscriber, removeSubscriber, hasSubscribers } from './manage-subscribers';

export const createOrJoinSocket = (
  webSocketRef: MutableRefObject<WebSocket | null>,
  url: string,
  setReadyState: (readyState: ReadyState) => void,
  optionsRef: MutableRefObject<Options>,
  setLastMessage: (message: WebSocketEventMap['message']) => void,
  startRef: MutableRefObject<() => void>,
  reconnectCount: MutableRefObject<number>,
): (() => void) => {
  if (optionsRef.current.share) {
    if (sharedWebSockets[url] === undefined) {
      setReadyState(ReadyState.CONNECTING);
      sharedWebSockets[url] = new WebSocket(url, optionsRef.current.protocols);
      attachSharedListeners(sharedWebSockets[url], url);
    } else {
      setReadyState(sharedWebSockets[url].readyState);
    }

    const subscriber = {
      setLastMessage,
      setReadyState,
      optionsRef,
      reconnectCount,
      reconnect: startRef,
    };
  
    addSubscriber(url, subscriber);
    webSocketRef.current = sharedWebSockets[url];

    return () => {
      removeSubscriber(url, subscriber);
      if (!hasSubscribers(url)) {
        try {
          sharedWebSockets[url].onclose = () => {};
          sharedWebSockets[url].close();
        } catch (e) {

        }
        delete sharedWebSockets[url];
      }
    };
  } else {
    setReadyState(ReadyState.CONNECTING);
    webSocketRef.current = new WebSocket(url, optionsRef.current.protocols);

    return attachListeners(
      webSocketRef.current,
      {
        setLastMessage,
        setReadyState
      },
      optionsRef,
      startRef.current,
      reconnectCount,
    );
  }
};
