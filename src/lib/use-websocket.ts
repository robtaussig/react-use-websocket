import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { DEFAULT_OPTIONS, isEventSourceSupported, ReadyState, UNPARSABLE_JSON_OBJECT } from './constants';
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
  WebSocketLike,
} from './types';
import { assertIsWebSocket } from './util';

export const useWebSocket = (
  url: string | (() => string | Promise<string>) | null,
  options: Options = DEFAULT_OPTIONS,
  connect: boolean = true,
): WebSocketHook => {
  const [lastMessage, setLastMessage] = useState<WebSocketEventMap['message'] | null>(null);
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
  const convertedUrl = useRef<string | null>(null);
  const webSocketRef = useRef<WebSocketLike | null>(null);
  const startRef = useRef<() => void>(() => void 0);
  const reconnectCount = useRef<number>(0);
  const messageQueue = useRef<WebSocketMessage[]>([]);
  const webSocketProxy = useRef<WebSocketLike | null>(null);
  const optionsCache = useRef<Options>(options);
  optionsCache.current = options;

  const readyStateFromUrl: ReadyState =
    convertedUrl.current && readyState[convertedUrl.current] !== undefined ?
      readyState[convertedUrl.current] :
      url !== null && connect === true ?
        ReadyState.CONNECTING :
        ReadyState.UNINSTANTIATED;

  const stringifiedQueryParams = options.queryParams ? JSON.stringify(options.queryParams) : null;

  const sendMessage: SendMessage = useCallback((message, keep = true) => {
    if (isEventSourceSupported && webSocketRef.current instanceof EventSource) {
      console.warn('Unable to send a message from an eventSource');
      return;
    }
  
    if (webSocketRef.current?.readyState === ReadyState.OPEN) {
      assertIsWebSocket(webSocketRef.current);
      webSocketRef.current.send(message);
    } else if (keep) {
      messageQueue.current.push(message);
    }
  }, []);

  const sendJsonMessage: SendJsonMessage = useCallback((message, keep = true) => {
    sendMessage(JSON.stringify(message), keep);
  }, [sendMessage]);
  
  const getWebSocket = useCallback(() => {
    if (optionsCache.current.share !== true || (isEventSourceSupported && webSocketRef.current instanceof EventSource)) {
      return webSocketRef.current;
    }

    if (webSocketProxy.current === null && webSocketRef.current) {
      assertIsWebSocket(webSocketRef.current);
      webSocketProxy.current = websocketWrapper(webSocketRef.current, startRef);
    }

    return webSocketProxy.current;
  }, []);

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
              ...(convertedUrl.current && {[convertedUrl.current]: state}),
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
          sendMessage,
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
    } else if (url === null || connect === false) {
      reconnectCount.current = 0; // reset reconnection attempts
      setReadyState(prev => ({
        ...prev,
        ...(convertedUrl.current && {[convertedUrl.current]: ReadyState.CLOSED}),
      }));
    }
  }, [url, connect, stringifiedQueryParams, sendMessage]);

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
