import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { parseSocketIOUrl } from './socket-io';
import { attachListeners } from './attach-listener';
import { DEFAULT_OPTIONS, READY_STATE_CONNECTING } from './constants';
import { createOrJoinSocket } from './create-or-join';

export const useWebSocket = (url, options = DEFAULT_OPTIONS) => {
  const [ lastMessage, setLastMessage ] = useState(null);
  const [ readyState, setReadyState ] = useState({});
  const webSocketRef = useRef(null);
  const retryCount = useRef(0);
  const staticOptionsCheck = useRef(null);

  const convertedUrl = useMemo(() => {
    if (options.fromSocketIO) {
      return parseSocketIOUrl(url);
    } 
    return url;
  }, [url]);
  const sendMessage = useCallback(message => {
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
