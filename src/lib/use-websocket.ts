import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { parseSocketIOUrl, appendQueryParams, QueryParams } from './socket-io';
import { attachListeners } from './attach-listener';
import { DEFAULT_OPTIONS } from './constants';
import { createOrJoinSocket } from './create-or-join';
import websocketWrapper from './proxy';
import { ReadyState } from './constants';

export interface Options {
  fromSocketIO?: boolean;
  queryParams?: QueryParams;
  share?: boolean;
  onOpen?: (event: WebSocketEventMap['open']) => void;
  onClose?: (event: WebSocketEventMap['close']) => void;
  onMessage?: (event: WebSocketEventMap['message']) => void;
  onError?: (event: WebSocketEventMap['error']) => void;
  shouldReconnect?: (event: WebSocketEventMap['close']) => boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  filter?: (message: WebSocketEventMap['message']) => boolean;
  retryOnError?: boolean;
  enforceStaticOptions?: boolean;
}

export type ReadyStateState = {
  [url: string]: ReadyState,
}

export type SendMessage = (message: (string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView)) => void;
// export type WebSocketProxy = <typeof ProxyWebSocket>;

export const useWebSocket = (
  url: string,
  options: Options = DEFAULT_OPTIONS,
): [SendMessage, WebSocketEventMap['message'], ReadyState, () => WebSocket] => {
  const [ lastMessage, setLastMessage ] = useState<WebSocketEventMap['message']>(null);
  const [ readyState, setReadyState ] = useState<ReadyStateState>({});
  const webSocketRef = useRef<WebSocket>(null);
  const startRef = useRef<() => void>(null);
  const reconnectCount = useRef<number>(0);
  const expectClose = useRef<boolean>(false);
  const webSocketProxy = useRef<WebSocket>(null)
  const staticOptionsCheck = useRef<boolean>(false);

  const convertedUrl = useMemo(() => {
    const converted = options.fromSocketIO ? parseSocketIOUrl(url) : url;
    const alreadyHasQueryParams = options.fromSocketIO;

    return options.queryParams ?
      appendQueryParams(converted, options.queryParams, alreadyHasQueryParams) :
      converted;
  }, [url]);

  const sendMessage: SendMessage = useCallback(message => {
    webSocketRef.current && webSocketRef.current.send(message);
  }, []);
  
  const getWebSocket = useCallback(() => {
    if (webSocketProxy.current === null) {
      webSocketProxy.current = websocketWrapper(webSocketRef.current, startRef);
    }
    
    return webSocketProxy.current;
  }, []);

  useEffect(() => {
    let removeListeners: () => void;

    const start = (): void => {
      expectClose.current = false;
      
      createOrJoinSocket(webSocketRef, convertedUrl, setReadyState, options);

      removeListeners = attachListeners(webSocketRef.current, convertedUrl, {
        setLastMessage,
        setReadyState,
      }, options, startRef.current, reconnectCount, expectClose);
    };

    startRef.current = () => {
      expectClose.current = true;
      if (webSocketProxy.current) webSocketProxy.current = null;
      removeListeners();
      start();
    };
  
    start();
    return () => {
      expectClose.current = true;
      if (webSocketProxy.current) webSocketProxy.current = null;
      removeListeners();
    };
  }, [convertedUrl]);

  useEffect(() => {
    if (
      options.enforceStaticOptions !== false && staticOptionsCheck.current
    ) {
        throw new Error('The options object you pass must be static');
    }

    staticOptionsCheck.current = true;
  }, [options]);

  const readyStateFromUrl = readyState[convertedUrl] !== undefined ? readyState[convertedUrl] : ReadyState.CONNECTING;

  return [ sendMessage, lastMessage, readyStateFromUrl, getWebSocket ];
};
