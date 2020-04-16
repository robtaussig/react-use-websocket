import { useEffect, useRef, useState, useCallback } from 'react';
import { attachListeners } from './attach-listener';
import { DEFAULT_OPTIONS, ReadyState } from './constants';
import { createOrJoinSocket } from './create-or-join';
import { getUrl } from './get-url';
import websocketWrapper from './proxy';
import {
  Options,
  ReadyStateState,
  SendMessage,
  WebSocketMessage,
} from './types';

export const useWebSocket = (
  url: string | (() => string | Promise<string>),
  options: Options = DEFAULT_OPTIONS,
): [SendMessage, WebSocketEventMap['message'], ReadyState, () => WebSocket] => {
  const [ lastMessage, setLastMessage ] = useState<WebSocketEventMap['message']>(null);
  const [ readyState, setReadyState ] = useState<ReadyStateState>({});
  const convertedUrl = useRef<string>(null);
  const webSocketRef = useRef<WebSocket>(null);
  const startRef = useRef<() => void>(null);
  const reconnectCount = useRef<number>(0);
  const messageQueue = useRef<WebSocketMessage[]>([]);
  const expectClose = useRef<boolean>(false);
  const webSocketProxy = useRef<WebSocket>(null)
  const staticOptionsCheck = useRef<boolean>(false);

  const readyStateFromUrl =
    convertedUrl.current && readyState[convertedUrl.current] !== undefined ?
      readyState[convertedUrl.current] :
      ReadyState.CONNECTING;

  const sendMessage: SendMessage = useCallback(message => {
    if (webSocketRef.current && webSocketRef.current.readyState === ReadyState.OPEN) {
      webSocketRef.current.send(message);
    } else {
      messageQueue.current.push(message);
    }
  }, []);
  
  const getWebSocket = useCallback(() => {
    if (options.share !== true) {
      return webSocketRef.current;
    }

    if (webSocketProxy.current === null) {
      webSocketProxy.current = websocketWrapper(webSocketRef.current, startRef);
    }
    
    return webSocketProxy.current;
  }, [options.share]);

  useEffect(() => {
    if (url !== null) {
      let removeListeners: () => void;

      const start = async () => {
        expectClose.current = false;
        convertedUrl.current = await getUrl(url, options);

        createOrJoinSocket(webSocketRef, convertedUrl.current, setReadyState, options);

        removeListeners = attachListeners(webSocketRef.current, convertedUrl.current, {
          setLastMessage,
          setReadyState,
        }, options, startRef.current, reconnectCount, expectClose, sendMessage);
      };

      startRef.current = () => {
        expectClose.current = true;
        if (webSocketProxy.current) webSocketProxy.current = null;
        removeListeners?.();
        start();
      };
    
      start();
      return () => {
        expectClose.current = true;
        if (webSocketProxy.current) webSocketProxy.current = null;
        removeListeners?.();
      };
    }
  }, [url, sendMessage]);

  useEffect(() => {
    if (
      options.enforceStaticOptions !== false && staticOptionsCheck.current
    ) {
        throw new Error('The options object you pass must be static');
    }

    staticOptionsCheck.current = true;
  }, [options]);

  useEffect(() => {
    if (readyStateFromUrl === ReadyState.OPEN) {
      messageQueue.current.splice(0).forEach(message => {
        sendMessage(message);
      });
    }
  }, [readyStateFromUrl]);

  return [ sendMessage, lastMessage, readyStateFromUrl, getWebSocket ];
};
