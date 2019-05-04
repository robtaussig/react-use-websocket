import { useEffect, useRef, useState, useCallback } from 'react';

const sharedWebSockets = {};
const subscribers = {};

const attachListeners = (webSocketInstance, url, setLastMessage, options) => {
  if (options.share) {
    const removeSubscriber = addSubscriber(webSocketInstance, url, setLastMessage, options);

    return removeSubscriber;
  } else {
    webSocketInstance.onmessage = message => {
      if (options.onMessage) options.onMessage(message);
      setLastMessage(message);
    };
  
    if (options.onOpen) webSocketInstance.onopen = options.onOpen;
    if (options.onClose) webSocketInstance.onclose = options.onClose;
    if (options.onError) webSocketInstance.onerror = options.onError;

    return webSocketInstance.close;
  }
};

const createOrJoinSocket = (webSocketRef, url, options) => {
  if (options.share) {
    if (sharedWebSockets[url] === undefined) {
      sharedWebSockets[url] = new WebSocket(url);
    }
    webSocketRef.current = sharedWebSockets[url];
  } else {
    webSocketRef.current = new WebSocket(url);
  }
};

const addSubscriber = (webSocketInstance, url, setLastMessage, options = {}) => {
  if (subscribers[url] === undefined) {
    subscribers[url] = [];

    webSocketInstance.onmessage = message => {
      subscribers[url].forEach(subscriber => {
        subscriber.setLastMessage(message);
        if (subscriber.options.onMessage) {
          subscriber.options.onMessage(message);
        }
      });
    };

    webSocketInstance.onclose = event => {
      subscribers[url].forEach(subscriber => {
        if (subscriber.options.onClose) {
          subscriber.options.onClose(event);
        }
      });

      subscribers[url] = undefined;
      sharedWebSockets[url] = undefined;
    };

    webSocketInstance.onerror = error => {
      subscribers[url].forEach(subscriber => {
        if (subscriber.options.onError) {
          subscriber.options.onError(error);
        }
      });
    };
  }

  const subscriber = {
    setLastMessage,
    options,
  };
  subscribers[url].push(subscriber);

  return () => {
    if (subscribers[url] !== undefined) {
      const index = subscribers[url].indexOf(subscriber);
      if (index !== -1) {
        if (subscribers[url].length === 1) {
          webSocketInstance.close();
        }
        subscribers[url].splice(index, 1);
      } else {
        throw new Error('A subscriber that is no longer registered has attempted to unsubscribe');
      }
    }
  };
};

export const useWebSocket = (url, options = {}) => {
  const webSocketRef = useRef(null);
  const [ lastMessage, setLastMessage ] = useState(null);
  const staticOptionsCheck = useRef(null);

  const sendMessage = useCallback(message => {
    webSocketRef.current && webSocketRef.current.send(message);
  }, []);

  useEffect(() => {
    createOrJoinSocket(webSocketRef, url, options);

    const removeListeners = attachListeners(webSocketRef.current, url, setLastMessage, options);

    return removeListeners;
  }, [url]);

  useEffect(() => {
    if (staticOptionsCheck.current) throw new Error('The options object you pass must be static');

    staticOptionsCheck.current = true;
  }, [options]);

  return [ sendMessage, lastMessage ];
};

export default useWebSocket;
