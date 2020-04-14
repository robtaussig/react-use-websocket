import { useEffect, useRef, useState, useCallback } from 'react';
import { parseSocketIOUrl, appendQueryParams } from './socket-io';
import { attachListeners } from './attach-listener';
import { DEFAULT_OPTIONS, ReadyState } from './constants';
import { createOrJoinSocket } from './create-or-join';
import websocketWrapper from './proxy';
import {
  Options,
  ReadyStateState,
  SendMessage,
  WebSocketMessage,
} from './types';

export const useWebSocket = (
  url: () => Promise<string> | string,
  options: Options = DEFAULT_OPTIONS,
): [SendMessage, WebSocketEventMap['message'], ReadyState, () => WebSocket] => {
  const [ lastMessage, setLastMessage ] = useState<WebSocketEventMap['message']>(null);
  const [ readyState, setReadyState ] = useState<ReadyStateState>({});
  const [ convertedUrl, setConvertedUrl ] = useState<string>(null);
  const webSocketRef = useRef<WebSocket>(null);
  const startRef = useRef<() => void>(null);
  const reconnectCount = useRef<number>(0);
  const messageQueue = useRef<WebSocketMessage[]>([]);
  const expectClose = useRef<boolean>(false);
  const webSocketProxy = useRef<WebSocket>(null)
  const staticOptionsCheck = useRef<boolean>(false);

  const readyStateFromUrl =
    convertedUrl && readyState[convertedUrl] !== undefined ?
      readyState[convertedUrl] :
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
    const getUrl = async () => {
      let convertedUrl: string;

      if (typeof url === 'function') {
        convertedUrl = await url();
      } else {
        convertedUrl = url;
      }

      const parsedUrl = options.fromSocketIO ?
        parseSocketIOUrl(convertedUrl) :
        convertedUrl;
  
      const parsedWithQueryParams = options.queryParams ?
        appendQueryParams(parsedUrl, options.queryParams, options.fromSocketIO) :
        convertedUrl;

        setConvertedUrl(parsedWithQueryParams);
    };

    getUrl();
  }, [url]);

  useEffect(() => {
    if (convertedUrl !== null) {
      let removeListeners: () => void;

      const start = (): void => {
        expectClose.current = false;
        
        createOrJoinSocket(webSocketRef, convertedUrl, setReadyState, options);

        removeListeners = attachListeners(webSocketRef.current, convertedUrl, {
          setLastMessage,
          setReadyState,
        }, options, startRef.current, reconnectCount, expectClose, sendMessage);
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
    }
  }, [convertedUrl, sendMessage]);

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
