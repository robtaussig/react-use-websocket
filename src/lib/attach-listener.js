import { setUpSocketIOPing } from './socket-io';
import { READY_STATE_OPEN, READY_STATE_CLOSED, READY_STATE_CLOSING, RETRY_LIMIT } from './constants';
import { addSubscriber } from './add-subscriber';

export const attachListeners = (webSocketInstance, url, setters, options, retry, retryCount) => {
  const { setLastMessage, setReadyState } = setters;

  let interval;

  if (options.fromSocketIO) {
    interval = setUpSocketIOPing(webSocketInstance);
  }

  if (options.share) {
    const removeSubscriber = addSubscriber(webSocketInstance, url, {
      setLastMessage,
      setReadyState,
    }, options);

    return removeSubscriber;
  }
  
  webSocketInstance.onmessage = message => {
    options.onMessage && options.onMessage(message);
    if (typeof options.filter === 'function' && options.filter(message) !== true) {
      return;
    }
    setLastMessage(message);
  };
  webSocketInstance.onopen = event => {
    options.onOpen && options.onOpen(event);
    retryCount.current = 0;
    setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_OPEN}));
  };
  webSocketInstance.onclose = event => {
    options.onClose && options.onClose(event);
    setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CLOSED}));
  };
  webSocketInstance.onerror = error => {
    options.onError && options.onError(error);

    if (options.retryOnError) {
      if (retryCount.current < RETRY_LIMIT) {
        retryCount.current++;
        retry();
      }
    }    
  };

  return () => {
    setReadyState(prev => Object.assign({}, prev, {[url]: READY_STATE_CLOSING}));
    webSocketInstance.close();
    if (interval) clearInterval(interval);
  };
};