export const websocketWrapper = (webSocket: WebSocket): Proxy<WebSocket> => {

  return new Proxy(webSocket, {
    get: (obj, key) => {
      const val = obj[key];
      if (typeof val === 'function') {
        console.error('Calling methods directly on the websocket is not supported at this moment. You must use the methods returned by useWebSocket.');
        
        //Prevent error thrown by invoking a non-function
        return () => {};
      } else {
        return val;
      }
    },
    set: (obj, key, val) => {
      if (/^on/.test(key)) {
        console.warn('The websocket\'s event handlers should be defined through the options object passed into useWebSocket.')
      } else {
        obj[key] = val;
      }
    },
  });
};

export default websocketWrapper;
