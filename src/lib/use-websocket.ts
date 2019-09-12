import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { parseSocketIOUrl, appendQueryParams, QueryParams } from './socket-io';
import { attachListeners } from './attach-listener';
import { DEFAULT_OPTIONS, READY_STATE_CONNECTING } from './constants';
import { createOrJoinSocket } from './create-or-join';

export enum ReadyStateEnum {
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

export interface Options {
  fromSocketIO?: boolean,
  queryParams?: QueryParams,
  share?: boolean,
  onOpen?: (event: Event) => void,
  onClose?: (event: Event) => void,
  onMessage?: (event: Event) => void,
  onError?: (event: Event) => void,
  filter?: (message: Message) => boolean,
  retryOnError?: boolean,
}

export type ReadyStateState = {
  [url: string]: ReadyStateEnum,
}

export type Message = {
  data: any,
}

export const useWebSocket = (url: string, options: Options = DEFAULT_OPTIONS): [(message:any) => void, Message, ReadyStateEnum] => {
  const [ lastMessage, setLastMessage ] = useState<Message | null>(null);
  const [ readyState, setReadyState ] = useState<ReadyStateState>({});
  const webSocketRef = useRef<any>(null);
  const retryCount = useRef<number>(0);
  const staticOptionsCheck = useRef<boolean|null>(null);

  const convertedUrl = useMemo(() => {
    const converted = options.fromSocketIO ? parseSocketIOUrl(url) : url;
    const alreadyHasQueryParams = options.fromSocketIO;

    return options.queryParams ?
      appendQueryParams(converted, options.queryParams, alreadyHasQueryParams) :
      converted;
  }, [url]);

  const sendMessage = useCallback((message: any): void => {
    webSocketRef.current && webSocketRef.current.send(message);
  }, []);

  useEffect(() => {
    let removeListeners;

    const start = () => {
      createOrJoinSocket(webSocketRef, convertedUrl, setReadyState, options);

      removeListeners = attachListeners(webSocketRef.current, convertedUrl, {
        setLastMessage,
        setReadyState,
      }, options, start, retryCount);
    };

    start();
    return removeListeners;
  }, [convertedUrl]);

  useEffect(() => {
    if (staticOptionsCheck.current) throw new Error('The options object you pass must be static');

    staticOptionsCheck.current = true;
  }, [options]);

  const readyStateFromUrl = readyState[convertedUrl] !== undefined ? readyState[convertedUrl] : READY_STATE_CONNECTING;

  return [ sendMessage, lastMessage, readyStateFromUrl ];
};
