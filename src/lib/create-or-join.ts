import { MutableRefObject } from 'react';
import { sharedWebSockets } from './globals';
import { ReadyStateState, Options } from './types';
import { ReadyState } from './constants';
import { attachListeners } from './attach-listener';
import { attachSharedListeners } from './attach-shared-listeners';
import { addSubscriber, removeSubscriber, hasSubscribers } from './manage-subscribers';

export const createOrJoinSocket = (
  webSocketRef: MutableRefObject<WebSocket>,
  url: string,
  setReadyState: (callback: (prev: ReadyStateState) => ReadyStateState) => void,
  optionsRef: MutableRefObject<Options>,
  setLastMessage: (message: WebSocketEventMap['message']) => void,
  startRef: MutableRefObject<() => void>,
  reconnectCount: MutableRefObject<number>,
  expectClose: MutableRefObject<boolean>,
): (() => void) => {
  if (optionsRef.current.share) {
    if (sharedWebSockets[url] === undefined) {
      setReadyState(prev => Object.assign({}, prev, {[url]: ReadyState.CONNECTING }));
      sharedWebSockets[url] = new WebSocket(url);
      attachSharedListeners(sharedWebSockets[url], url);
    } else {
      setReadyState(prev => Object.assign({}, prev, {[url]: sharedWebSockets[url].readyState }));
    }

    const subscriber = {
      setLastMessage,
      setReadyState,
      optionsRef,
      reconnectCount,
      reconnect: startRef,
      expectClose,
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
    setReadyState(prev => Object.assign({}, prev, {[url]: ReadyState.CONNECTING }));
    webSocketRef.current = new WebSocket(url);

    return attachListeners(
      webSocketRef.current,
      url,
      {
        setLastMessage,
        setReadyState
      },
      optionsRef,
      startRef.current,
      reconnectCount,
      expectClose
    );
  }
};
