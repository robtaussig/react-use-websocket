import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { attachListeners } from './attach-listener';
import { DEFAULT_OPTIONS, ReadyState, UNPARSABLE_JSON_OBJECT } from './constants';
import { createOrJoinSocket } from './create-or-join';
import { getUrl } from './get-url';
import websocketWrapper from './proxy';
import {
  Options,
  ReadyStateState,
  SendMessage,
  SendJsonMessage,
  WebSocketMessage,
  UseWebSocketReturnValue,
} from './types';

export const useWebSocket = (
  url: string | (() => string | Promise<string>) | null,
  options: Options = DEFAULT_OPTIONS,
  connect: boolean = true,
): UseWebSocketReturnValue => {
  const [ lastMessage, setLastMessage ] = useState<WebSocketEventMap['message']>(null);
  const lastJsonMessage = useMemo(() => {
    if (lastMessage) {
      try {
        return JSON.parse(lastMessage.data);
      } catch (e) {
        return UNPARSABLE_JSON_OBJECT;
      }
    }
    return null;
  },[lastMessage]);
  const [ readyState, setReadyState ] = useState<ReadyStateState>({});
  const convertedUrl = useRef<string>(null);
  const webSocketRef = useRef<WebSocket>(null);
  const startRef = useRef<() => void>(null);
  const reconnectCount = useRef<number>(0);
  const messageQueue = useRef<WebSocketMessage[]>([]);
  const expectClose = useRef<boolean>(false);
  const webSocketProxy = useRef<WebSocket>(null)
  const optionsCache = useRef<Options>(null);
  optionsCache.current = options;

  const readyStateFromUrl =
    convertedUrl.current && readyState[convertedUrl.current] !== undefined ?
      readyState[convertedUrl.current] :
      url !== null && connect === true ?
        ReadyState.CONNECTING :
        ReadyState.UNINSTANTIATED;

  const sendMessage: SendMessage = useCallback(message => {
    if (webSocketRef.current && webSocketRef.current.readyState === ReadyState.OPEN) {
      webSocketRef.current.send(message);
    } else {
      messageQueue.current.push(message);
    }
  }, []);

  const sendJsonMessage: SendJsonMessage = useCallback(message => {
    sendMessage(JSON.stringify(message));
  }, [sendMessage]);
  
  const getWebSocket = useCallback(() => {
    if (optionsCache.current.share !== true) {
      return webSocketRef.current;
    }

    if (webSocketProxy.current === null) {
      webSocketProxy.current = websocketWrapper(webSocketRef.current, startRef);
    }
    
    return webSocketProxy.current;
  }, [optionsCache]);

  useEffect(() => {
    if (url !== null && connect === true) {
      let removeListeners: () => void;

      const start = async () => {
        expectClose.current = false;
        convertedUrl.current = await getUrl(url, optionsCache);

        createOrJoinSocket(webSocketRef, convertedUrl.current, setReadyState, optionsCache);

        removeListeners = attachListeners(webSocketRef.current, convertedUrl.current, {
          setLastMessage,
          setReadyState,
        }, optionsCache, startRef.current, reconnectCount, expectClose);
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
  }, [url, connect, optionsCache, sendMessage]);

  useEffect(() => {
    if (readyStateFromUrl === ReadyState.OPEN) {
      messageQueue.current.splice(0).forEach(message => {
        sendMessage(message);
      });
    }
  }, [readyStateFromUrl]);

  return {
    sendMessage,
    sendJsonMessage,
    lastMessage,
    lastJsonMessage,
    readyState: readyStateFromUrl,
    getWebSocket,
  };
};
