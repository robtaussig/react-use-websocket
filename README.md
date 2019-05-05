# useWebSocket React Hook
[Live Demo](https://robtaussig.com/socket/)
[Test in StackBlitz](https://stackblitz.com/edit/react-dcwtsg)

React Hook designed to provide robust WebSocket integrations to your React Components. Experimental support for SocketIO (read documentation below for more information)

Pull requests welcomed!

## Why

Using WebSockets from the client is more than just exchanging messages. It requires working around the WebSocket's readyState, responding to non-user driven events (the WebSocket connection suddenly closing, for example), and for React in particular, it can become complex where there may be a many-to-one relationship between component/subscribers and a single WebSocket. This makes it particularly easy to experience bugs where listeners are not properly added and removed based on a component's lifecycle. React Hook's declarative improvements to how cleanup functions are built right into the hooks, and the ability to use powerful, reusable custom hooks that integrate seamlessly with functional React Components makes this a particularly compelling marriage of APIs.

## Example Implementation

```
import React, { useState, useCallback } from 'react';
import useWebSocket from 'react-use-websocket';

const CONNECTION_STATUS_CONNECTING = 0;
const CONNECTION_STATUS_OPEN = 1;
const CONNECTION_STATUS_CLOSING = 2;
const CONNECTION_STATUS_CLOSED = 3;

export const WebSocketDemo = () => {
  const [socketUrl, setSocketUrl] = useState('wss://echo.websocket.org'); //Public API that will echo messages sent to it back to the client
  const [messageHistory, setMessageHistory] = useState([]);
  const [sendMessage, lastMessage, readyState] = useWebSocket(socketUrl);

  const handleClickChangeSocketUrl = useCallback(() => setSocketUrl('wss://demos.kaazing.com/echo'), []);
  const handleClickSendMessage = useCallback(() => sendMessage('Hello'), []);

  useEffect(() => {
    if (lastMessage !== null) {
      setMessageHistory(prev => prev.concat(lastMessage));
    }
  }, [lastMessage]);

  const connectionStatus = {
    [CONNECTION_STATUS_CONNECTING]: 'Connecting',
    [CONNECTION_STATUS_OPEN]: 'Open',
    [CONNECTION_STATUS_CLOSING]: 'Closing',
    [CONNECTION_STATUS_CLOSED]: 'Closed',
  }[readyState];

  return (
    <div>
      <button onClick={handleClickChangeSocketUrl}>Click Me to change Socket Url</button>
      <button onClick={handleClickSendMessage} disabled={readyState !== CONNECTION_STATUS_OPEN}>Click Me to send 'Hello'</button>
      <span>The WebSocket is currently {connectionStatus}</span>
      <span>Last message: {lastMessage.data}</span>
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

```
npm install react-use-websocket

//In component

import useWebSocket from 'react-use-websocket';

//In component function
const [sendMessage, lastMessage, readyState] = useWebSocket('wss://echo.websocket.org', { onOpen: console.log });
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

## Options

**Right now, the options object, if any, passed to useWebSocket must be static (and any change to it after the first render will throw an error). In my own experimentation, and upon personal observation of colleagues using this in their own projects, it is too easy to create unintentional bugs due to misunderstanding how closures interact with dynamic props in React Hooks. I found that accounting for these misunderstandings at the library-level meant writing it in a way that would make it less intuitive to audit yourself. Solving for this at the component-level should be much easier and likely involve defining your event callbacks using a ref.**

### Event Handlers: Callback
Each of options.onMessage, options.onError, options.onClose, and options.onOpen will be called on the corresponding WebSocket event, if provided. Each will be passed the same event provided from the WebSocket.

### Share: Boolean
If set to true, a new websocket will not be instantiated if one for the same url has already been created for another component. Once all subscribing components have either unmounted or changed their target socket url, shared WebSockets will be closed and cleaned up. No other APIs should be affected by this.

### FromSocketIO: Boolean
SocketIO acts as a layer on top of the WebSocket protocol, and the required client-side implementation involves a few peculiarities. If you have a SocketIO back-end, or are converting a client-side application that uses the socketIO library, setting this to true might be enough to allow useWebSocket to work interchangeably. This is an experimental option as the SocketIO library might change its API at any time. This was tested with Socket IO 2.1.1.

#### Example options with ref solution
```
const dynamicPropRef = useRef(null);
dynamicPropRef.current = /*some prop you want to use in the options callbacks*/;
const options = useMemo(() => ({
  share: true,
  onMessage: message => console.log(`onMessage with access to dynamicProp: ${dynamicPropRef.current}`, message),
  onClose: event => console.log('onClose', event),
  onError: error => console.log('onError', error),
  onOpen: event => console.log('onOpen', event),
  fromSocketIO: true,
}),[]);

const [sendMessage, lastMessage, readyState] = useWebSocket('wss://echo.websocket.org', options);
```

## Known Issues
- I wanted this library to provide as much direct access to the WebSocket as possible, and so you still must follow traditional rules (no sending messages until the WebSocket is fully opened being the primary one). In the example implementation above, the send message button is disabled if the readyState isn't 1 (OPEN). Similar safeguards should be employed.

## Considered features
- On the note of sending messages before the WebSocket is open, I have considered creating a queue of messages that are sent while the WebSocket is not OPEN, and then firing them as soon as it opens.
- Reconnecting after errors.

## Next steps
- Eager to write tests and write a contributions guide.