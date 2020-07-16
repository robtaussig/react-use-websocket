import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  WebSocketHook,
} from './types';

export const useWebSocket = (
  url: string | (() => string | Promise<string>) | null,
  options: Options = DEFAULT_OPTIONS,
  connect: boolean = true,
): WebSocketHook => {
  const [lastMessage, setLastMessage] = useState<WebSocketEventMap['message']>(null);
  const [readyState, setReadyState] = useState<ReadyStateState>({});
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
  const convertedUrl = useRef<string>(null);
  const webSocketRef = useRef<WebSocket>(null);
  const startRef = useRef<() => void>(null);
  const reconnectCount = useRef<number>(0);
  const messageQueue = useRef<WebSocketMessage[]>([]);
  const webSocketProxy = useRef<WebSocket>(null)
  const optionsCache = useRef<Options>(null);
  optionsCache.current = options;

  const readyStateFromUrl: ReadyState =
    convertedUrl.current && readyState[convertedUrl.current] !== undefined ?
      readyState[convertedUrl.current] :
      url !== null && connect === true ?
        ReadyState.CONNECTING :
        ReadyState.UNINSTANTIATED;

  const stringifiedQueryParams = options.queryParams ? JSON.stringify(options.queryParams) : null;

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
      let expectClose = false;

      const start = async () => {
        convertedUrl.current = await getUrl(url, optionsCache);

        const protectedSetLastMessage = (message: WebSocketEventMap['message']) => {
          if (!expectClose) {
            setLastMessage(message);
          }
        };
  
        const protectedSetReadyState = (state: ReadyState) => {
          if (!expectClose) {
            setReadyState(prev => ({
              ...prev,
              [convertedUrl.current]: state,
            }));
          }
        };

        removeListeners = createOrJoinSocket(
          webSocketRef,
          convertedUrl.current,
          protectedSetReadyState,
          optionsCache,
          protectedSetLastMessage,
          startRef,
          reconnectCount,
        );
      };

      startRef.current = () => {
        if (!expectClose) {
          if (webSocketProxy.current) webSocketProxy.current = null;
          removeListeners?.();
          start();
        }
      };
    
      start();
      return () => {
        expectClose = true;
        if (webSocketProxy.current) webSocketProxy.current = null;
        removeListeners?.();
        setLastMessage(null);
      };
    }
  }, [url, connect, stringifiedQueryParams, optionsCache, sendMessage]);

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
