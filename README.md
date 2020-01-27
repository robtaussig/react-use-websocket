# useWebSocket React Hook
[Live Demo](https://robtaussig.com/socket/)

[Test in StackBlitz](https://stackblitz.com/edit/react-huzf9f)

React Hook designed to provide robust WebSocket integrations to your React Components. Experimental support for SocketIO (read documentation below for more information)

Pull requests welcomed!

## Why

Using WebSockets from the client is more than just exchanging messages. It requires working around the WebSocket's readyState, responding to non-user driven events (the WebSocket connection suddenly closing, for example), and for React in particular, it can become complex where there may be a many-to-one relationship between component/subscribers and a single WebSocket. This makes it particularly easy to experience bugs where listeners are not properly added and removed based on a component's lifecycle. React Hook's declarative improvements to how cleanup functions are built right into the hooks, and the ability to use powerful, reusable custom hooks that integrate seamlessly with functional React Components makes this a particularly compelling marriage of APIs.

## Example Implementation

```js
import React, { useState, useCallback, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

export const WebSocketDemo = () => {
  const [socketUrl, setSocketUrl] = useState('wss://echo.websocket.org'); //Public API that will echo messages sent to it back to the client
  const [messageHistory, setMessageHistory] = useState([]);
  const [sendMessage, lastMessage, readyState, getWebSocket] = useWebSocket(socketUrl);

  const handleClickChangeSocketUrl = useCallback(() => setSocketUrl('wss://demos.kaazing.com/echo'), []);
  const handleClickSendMessage = useCallback(() => sendMessage('Hello'), []);

  useEffect(() => {
    if (lastMessage !== null) {
    
      //getWebSocket returns the WebSocket wrapped in a Proxy. This is to restrict actions like mutating a shared websocket, overwriting handlers, etc
      const currentWebsocketUrl = getWebSocket().url;
      console.log('received a message from ', currentWebsocketUrl);
      
      setMessageHistory(prev => prev.concat(lastMessage));
    }
  }, [lastMessage]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
  }[readyState];

  return (
    <div>
      <button onClick={handleClickChangeSocketUrl}>Click Me to change Socket Url</button>
      <button onClick={handleClickSendMessage} disabled={readyState !== ReadyState.OPEN}>Click Me to send 'Hello'</button>
      <span>The WebSocket is currently {connectionStatus}</span>
      {lastMessage ? <span>Last message: {lastMessage.data}</span> : null}
      <ul>
        {messageHistory.map((message, idx) => <span key={idx}>{message.data}</span>)}
      </ul>
    </div>
  );
};

```

From the example above, the component will rerender every time the readyState of the WebSocket changes, as well as when the WebSocket receives a message (which will change lastMessage). sendMessage is a memoized callback that will proxy the message to the current WebSocket (referenced to internally with useRef).

A demo of this can be found [here](https://robtaussig.com/socket/). Each component uses its own useWebSocket hook. This implementation takes advantage of passing an optional options object (documented below). Among setting event callbacks (for onmessage, onclose, onerror, and onopen) that will log to the console, it is using the share option, which means if multiple components pass the same socketUrl to useWebSocket and both have options.share equal to true, then only a single WebSocket will be created and useWebSocket will manage subscriptions/unsubscriptions internally. This of course means that the shared WebSockets will need to be cached. useWebSocket will keep track of how many subscribers any given WebSocket has and will automatically free it from memory once there are no subscribers remaining (a subscriber unsubscribes when it either unmounts or changes its socketUrl). Of course, multiple WebSockets can be created with the same target url, and so components are not required to share the same communication pipeline.

## Getting Started

```sh
npm install react-use-websocket
```

```js
// In component
import useWebSocket from 'react-use-websocket';

// In component function
const STATIC_OPTIONS = useMemo(() => ({
  onOpen: () => console.log('opened'),
  shouldReconnect: (closeEvent) => true, //Will attempt to reconnect on all close events, such as server shutting down
}), []);

const [sendMessage, lastMessage, readyState, getWebSocket] = useWebSocket('wss://echo.websocket.org', STATIC_OPTIONS);
```

## Requirements
- React 16.8+
- Cannot be used within a class component (must be a functional component that supports React Hooks)

## API

### sendMessage: Function(Any)
The argument sent through sendMessage will be passed directly to WebSocket#send. sendMessage will be static, and thus can be passed down through children components without triggering prop changes.


### lastMessage: MessageEvent

Will be an unparsed MessageEvent received from the WebSocket.

### readyState: Enum<0, 1, 2, 3>

Will be an integer representing the readyState of the WebSocket.

## Reconnecting
By default, `useWebSocket` does not attempt to reconnect to a websocket after it disconnects. This behavior can be modified through a few options. To attempt to reconnect on error events, set `Options#retryOnError` to `true`. Because close events are less straight forward (e.g., was the close event triggered intentionally by the client or by something unexpected by the server restarting?), `Options#shouldReconnect` must be provided as a callback, with the socket closeEvent as the first and only argument, and a return value of either `true` or `false`. If `true`, `useWebSocket` will attempt to reconnect up to a specified number of attempts (with a default of `20`) at a specified interval (with a default of `5000` (ms)). The option properties for attempts is `Options#reconnectAttempts` and the interval is `Options#reconnectInterval`. As an example:

```js
const didUnmount = useRef(false);

const options = useMemo(() =>({
  shouldReconnect: (closeEvent) => {
    return didUnmount.current === false; //useWebSocket will handle unmounting for you, but this is an example of a case in which you would not want it to automatically reconnect
  },
  reconnectAttempts: 10,
  reconnectInterval: 3000,
}, []);

const [sendMessage, lastMessage, readyState] = useWebSocket('wss://echo.websocket.org', options);

useEffect(() => {
  return () => {
    didUnmount.current = true;
  };
});
```

### getWebSocket: Function() -> Proxy<WebSocket>

Calling this function will lazily instantiate a Proxy instance that wraps the underlying websocket. You can get and set properties on the return value that will directly interact with the websocket, however certain properties/methods are protected (cannot invoke `close` or `send`, and cannot redefine any of the event handlers like `onmessage`, `onclose`, `onopen` and `onerror`. An example of using this:

```js
const [sendMessage, lastMessage, readyState, getWebSocket] = useWebSocket('wss://echo.websocket.org');

//Run on mount
useEffect(() => {
  console.log(getWebSocket().binaryType)
  //=> 'blob'
  
  //Change binaryType property of websocket
  getWebSocket().binaryType = 'arraybuffer';
  
  console.log(getWebSocket().binaryType)
  //=> 'arraybuffer'
  
  //Attempt to change event handler
  getWebSocket().onmessage = console.log
  //=> A warning is logged to console: 'The websocket's event handlers should be defined through the options object passed into useWebSocket.'
  
  //Attempt to change an immutable property
  getWebSocket().url = 'www.google.com';
  console.log(getWebSocket().url);
  //=> 'wss://echo.websocket.org'
  
  //Attempt to call webSocket#send
  getWebSocket().send('Hello from WebSocket');
  //=> No message is sent, and no error thrown (a no-op function was returned), but an error will be logged to console: 'Calling methods directly on the websocket is not supported at this moment. You must use the methods returned by useWebSocket.'
}, []);
```

## Options

**Right now, the options object, if any, passed to useWebSocket must be static (and any change to it after the first render will throw an error [(see exception)](#Disabling-Static-Options-Check)). In my own experimentation, and upon personal observation of colleagues using this in their own projects, it is too easy to create unintentional bugs due to misunderstanding how closures interact with dynamic props in React Hooks. I found that accounting for these misunderstandings at the library-level meant writing it in a way that would make it less intuitive to audit yourself. Solving for this at the component-level should be much easier and likely involve defining your event callbacks using a ref.**

### Example options with ref solution
```js
const dynamicPropRef = useRef(null);
dynamicPropRef.current = /*some prop you want to use in the options callbacks*/;

const options = useMemo(() => ({
  share: true,
  onMessage: message => console.log(`onMessage with access to dynamicProp: ${dynamicPropRef.current}`, message),
  onClose: event => console.log('onClose', event),
  onError: error => console.log('onError', error),
  onOpen: event => console.log('onOpen', event),
  fromSocketIO: true,
  queryParams: { 'user_id': 1 },
  shouldReconnect: () => dynamicPropRef.current === true, //If websocket closing is intentional, can set dynamicPropRef to false to avoid unnecessary reconnect attempts
}),[]);

const [sendMessage, lastMessage, readyState] = useWebSocket('wss://echo.websocket.org', options);
```

### ShouldReconnect
See section on [Reconnecting](#Reconnecting)

### Event Handlers: Callback
Each of options.onMessage, options.onError, options.onClose, and options.onOpen will be called on the corresponding WebSocket event, if provided. Each will be passed the same event provided from the WebSocket.

### Share: Boolean
If set to true, a new websocket will not be instantiated if one for the same url has already been created for another component. Once all subscribing components have either unmounted or changed their target socket url, shared WebSockets will be closed and cleaned up. No other APIs should be affected by this.

### FromSocketIO: Boolean
SocketIO acts as a layer on top of the WebSocket protocol, and the required client-side implementation involves a few peculiarities. If you have a SocketIO back-end, or are converting a client-side application that uses the socketIO library, setting this to true might be enough to allow useWebSocket to work interchangeably. This is an experimental option as the SocketIO library might change its API at any time. This was tested with Socket IO 2.1.1.

### QueryParams: Object
Pass an object representing an arbitrary number of query parameters, which will be converted into stringified query params and appended to the websocket url.

```js
const queryParams = {
  'user_id': 1,
  'room_id': 5
};
//<url>?user_id=1&room_id=5
```

### useSocketIO
SocketIO sends messages in a format that isn't JSON-parsable. One example is:
```
"42["Action",{"key":"value"}]"
```
An extension of this hook is available by importing useSocketIO:
```js
import { useSocketIO } from 'react-use-websocket';

//Same API in component
const [sendMessage, lastMessage, readyState] = useSocketIO('http://localhost:3000/');
```
It is important to note that lastMessage will not be a MessageEvent, but instead an object with two keys: `type` and `payload`.

### Filter: Callback
If a function is provided with the key `filter`, incoming messages will be passed through the function, and only if it returns `true` will the hook pass along the lastMessage and update your component.

## Known Issues
- I wanted this library to provide as much direct access to the WebSocket as possible, and so you still must follow traditional rules (no sending messages until the WebSocket is fully opened being the primary one). In the example implementation above, the send message button is disabled if the readyState isn't 1 (OPEN). Similar safeguards should be employed.

## Considered features
- On the note of sending messages before the WebSocket is open, I have considered creating a queue of messages that are sent while the WebSocket is not OPEN, and then firing them as soon as it opens.

## Next steps
- Eager to write tests and write a contributions guide.

## Disabling Static Options Check
- If this error is being incorrectly thrown (in some cases, hot-reloading in development has been reported to trigger it), you can defined `enforceStaticOptions` as true in the options object. Note that I do not have plans at the moment to support dynamically generated options, and that bugs arising from abuse will be considered low priority.
