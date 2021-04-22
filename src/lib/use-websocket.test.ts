import { renderHook } from '@testing-library/react-hooks';
import { useWebSocket } from './use-websocket';
import WS from "jest-websocket-mock";
import { Options } from './types';
import { ReadyState } from './constants';
import { parseSocketIOUrl } from './socket-io';

let server: WS;
const URL = 'ws://localhost:1234';
const SOCKET_IO_URL = parseSocketIOUrl(URL);
const noop = () => {};
const DEFAULT_OPTIONS: Options = {};
let options: Options;
const sleep = (duration: number): Promise<void> => new Promise(resolve => setTimeout(() => resolve(), duration));
console.error = noop;

beforeEach(() => {
  server = new WS(URL);
  options = { ...DEFAULT_OPTIONS };
});

afterEach(() => {
  WS.clean();
});

test('useWebsocket should work with just a url provided', () => {
  expect(() => {
    renderHook(() => useWebSocket(URL));
  }).not.toThrow();
})

test('readyState changes across readyState transitions', async (done) => {
  const {
    result,
    rerender,
    waitForNextUpdate,
  } = renderHook(({ initialValue }) => useWebSocket(URL, options, initialValue), {
    initialProps: { initialValue: false }
  })

  expect(result.current.readyState).toEqual(ReadyState.UNINSTANTIATED);
  rerender({ initialValue: true });

  expect(result.current.readyState).toEqual(ReadyState.CONNECTING);
  await server.connected;
  expect(result.current.readyState).toEqual(ReadyState.OPEN);

  
  waitForNextUpdate()
    .then(() => {
      expect(result.current.readyState).toEqual(ReadyState.CLOSED);
      done();
    })

  server.close();
})

test('a function-promise based url works the same as a string-based url', async (done) => {
  const getUrl = () => {
    return new Promise<string>(resolve => {
      setTimeout(() => resolve(URL), 1000);
    });
  }

  const {
    result,
    rerender,
    waitForNextUpdate,
  } = renderHook(({ initialValue }) => useWebSocket(getUrl, options, initialValue), {
    initialProps: { initialValue: false }
  })

  expect(result.current.readyState).toEqual(ReadyState.UNINSTANTIATED);
  rerender({ initialValue: true });

  expect(result.current.readyState).toEqual(ReadyState.CONNECTING);
  await server.connected;
  expect(result.current.readyState).toEqual(ReadyState.OPEN);

  
  waitForNextUpdate()
    .then(() => {
      expect(result.current.readyState).toEqual(ReadyState.CLOSED);
      done();
    })

  server.close();
})

test('lastMessage updates when websocket receives a message', async (done) => {
  const {
    result,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  expect(result.current.lastMessage).toBe(null);
  server.send('Hello');
  expect(result.current.lastMessage?.data).toBe('Hello');
  server.send('There');
  server.send('Friend');
  expect(result.current.lastMessage?.data).toBe('Friend');
  done();
})

test('lastJsonMessage updates with a json object when websocket receives a message', async (done) => {
  const {
    result,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  expect(result.current.lastJsonMessage).toBe(null);

  server.send(JSON.stringify({ name: 'Bob' }));
  expect(result.current.lastJsonMessage.name).toBe('Bob');

  done();
})

test('sendMessage passes message to websocket and sends to server', async (done) => {
  const {
    result,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  result.current.sendMessage("Hello");
  await expect(server).toReceiveMessage("Hello");
  
  done();
})

test('if sendMessage is called before the websocket opens, the message will be queued and sent when the websocket opens', async (done) => {
  const {
    result,
  } = renderHook(() => useWebSocket(URL, options))
  expect(result.current.readyState).not.toEqual(ReadyState.OPEN);
  result.current.sendMessage("Hello");
  await expect(server).toReceiveMessage("Hello");
  
  done();
})

test('sendJsonMessage allows component to pass a json object which is serialized and sent to server', async (done) => {
  const {
    result,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  result.current.sendJsonMessage({ name: 'Bob'  });

  await expect(server).toReceiveMessage(JSON.stringify({ name: 'Bob'  }));
  
  done();
})

test('getWebSocket returns the underlying websocket if unshared', async (done) => {
  const {
    result,
    waitForNextUpdate,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  const ws = result.current.getWebSocket();

  expect(ws instanceof WebSocket).toBe(true);
  
  Promise.race([
    waitForNextUpdate(),
    sleep(500),
  ])
    .then(() => {
      expect(result.current.readyState).toBe(ReadyState.CLOSED);

      done();
    })

  ws?.close();
})

test('getWebSocket returns a protected websocket when shared', async (done) => {
  options.share = true;
  const {
    result,
    waitForNextUpdate,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  const ws = result.current.getWebSocket();
  
  Promise.race([
    waitForNextUpdate(),
    sleep(500),
  ])
    .then(() => {
      expect(result.current.readyState).toBe(ReadyState.OPEN);

      done();
    })

  ws?.close();
})

test('websocket is closed when the component unmounts', async (done) => {
  const {
    result,
    unmount,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  const ws = result.current.getWebSocket();
  
  unmount();
  expect(ws?.readyState).toBe(ReadyState.CLOSING);
  await sleep(500);
  expect(ws?.readyState).toBe(ReadyState.CLOSED);
  done();
})

test('shared websockets receive updates as if unshared', async (done) => {
  const {
    result: component1,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;

  const {
    result: component2,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;

  const {
    result: component3,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;

  
  server.send('Hello all');
  
  expect(component1.current.lastMessage?.data).toBe('Hello all');
  expect(component2.current.lastMessage?.data).toBe('Hello all');
  expect(component3.current.lastMessage?.data).toBe('Hello all');
  done();
})

test('shared websockets each have callbacks invoked as if unshared', async (done) => {
  const component1OnClose = jest.fn(() => {});
  renderHook(() => useWebSocket(URL, {
    ...options,
    onClose: component1OnClose,
  }));

  await server.connected;

  const component2OnClose = jest.fn(() => {});
  renderHook(() => useWebSocket(URL, {
    ...options,
    onClose: component2OnClose,
  }));

  await server.connected;

  const component3OnClose = jest.fn(() => {}); 
  renderHook(() => useWebSocket(URL, {
    ...options,
    onClose: component3OnClose,
  }));

  await server.connected;

  expect(component1OnClose).not.toHaveBeenCalled();
  expect(component2OnClose).not.toHaveBeenCalled();
  expect(component3OnClose).not.toHaveBeenCalled();

  server.close();
  await sleep(500);

  expect(component1OnClose).toHaveBeenCalledTimes(1);
  expect(component2OnClose).toHaveBeenCalledTimes(1);
  expect(component3OnClose).toHaveBeenCalledTimes(1);

  done();
})

test('Options#fromSocketIO changes the WS url to support socket.io\'s required query params', async (done) => {
  options.fromSocketIO = true;

  const {
    result,
    waitForNextUpdate,
  } = renderHook(() => useWebSocket(URL, options));

  await waitForNextUpdate();
  const ws = result.current.getWebSocket();
  expect(ws?.url).toEqual(SOCKET_IO_URL);

  done();
});

test('Options#queryParams append object-based params as string to url', async (done) => {
  options.queryParams = { type: 'user', id: 5 };

  const {
    result,
    waitForNextUpdate,
  } = renderHook(() => useWebSocket(URL, options));

  await waitForNextUpdate();
  const ws = result.current.getWebSocket();
  expect(ws?.url).toEqual(`${URL}/?type=user&id=5`);
  
  done();
});

test('Options#protocols pass the value on to the instantiated WebSocket', async (done) => {
  options.protocols = 'chat';

  const {
    result,
    waitForNextUpdate,
  } = renderHook(() => useWebSocket(URL, options));

  await waitForNextUpdate();
  const ws = result.current.getWebSocket();
  if (ws instanceof WebSocket) {
    expect(ws?.protocol).toEqual('chat');
  }
  
  done();
});

test('Options#share subscribes multiple components to a single WebSocket, so long as the URL is the same', async (done) => {
  options.share = true;
  
  const onConnectionFn = jest.fn();
  server.on('connection', onConnectionFn);

  renderHook(() => useWebSocket(URL, options));
  renderHook(() => useWebSocket(URL, options));
  renderHook(() => useWebSocket(URL, options));

  await sleep(500);

  expect(onConnectionFn).toHaveBeenCalledTimes(1);

  done();
});

test('if Options#share is not true, multiple websockets will be opened for the same url', async (done) => {
  const onConnectionFn = jest.fn();
  server.on('connection', onConnectionFn);

  renderHook(() => useWebSocket(URL, options));
  renderHook(() => useWebSocket(URL, options));
  renderHook(() => useWebSocket(URL, options));

  await sleep(500);

  expect(onConnectionFn).toHaveBeenCalledTimes(3);

  done();
});

test('Options#onOpen is called with the open event when the websocket connection opens', async (done) => {
  const onOpenFn = jest.fn();
  options.onOpen = onOpenFn;

  renderHook(() => useWebSocket(URL, options));
  await server.connected;
  expect(onOpenFn).toHaveBeenCalledTimes(1);
  expect(onOpenFn.mock.calls[0][0].constructor.name).toBe('Event');
  done();
});

test('Options#onClose is called with the close event when the websocket connection closes', async (done) => {
  const onCloseFn = jest.fn();
  options.onClose = onCloseFn;

  const { waitForNextUpdate } = renderHook(() => useWebSocket(URL, options));
  await server.connected;
  waitForNextUpdate()
    .then(() => {
      expect(onCloseFn).toHaveBeenCalledTimes(1);
      expect(onCloseFn.mock.calls[0][0].constructor.name).toBe('CloseEvent');
      done();
    })
  server.close();
});

test('Options#onMessage is called with the MessageEvent when the websocket receives a message', async (done) => {
  const onMessageFn = jest.fn();
  options.onMessage = onMessageFn;

  const { waitForNextUpdate } = renderHook(() => useWebSocket(URL, options));
  await server.connected;
  waitForNextUpdate()
    .then(() => {
      expect(onMessageFn).toHaveBeenCalledTimes(1);
      expect(onMessageFn.mock.calls[0][0].constructor.name).toBe('MessageEvent');
      done();
    })
  server.send('Hello');
});

test('Options#onError is called when the websocket connection errors out', async (done) => {
  const onErrorFn = jest.fn();
  options.onError = onErrorFn;

  const { waitForNextUpdate } = renderHook(() => useWebSocket(URL, options));
  await server.connected;
  waitForNextUpdate()
    .then(() => {
      expect(onErrorFn).toHaveBeenCalledTimes(1);
      expect(onErrorFn.mock.calls[0][0].constructor.name).toBe('MessageEvent');
      done();
    })
  server.error();
});

test('Options#shouldReconnect controls whether a closed websocket should attempt to reconnect', async (done) => {
  options.shouldReconnect = () => false;
  options.reconnectInterval = 500; //Default interval is too long for tests

  const onConnectionFn = jest.fn((ws: any) => ws.close());
  server.on('connection', onConnectionFn);

  renderHook(() => useWebSocket(URL, options));
  await sleep(600);//100ms buffer to avoid race condition

  expect(onConnectionFn).toHaveBeenCalledTimes(1);

  options.shouldReconnect = () => true;

  renderHook(() => useWebSocket(URL, options));
  await sleep(600);
  expect(onConnectionFn).toHaveBeenCalledTimes(3);

  done();
});

test('Options#onReconnectStop is called when the websocket exceeds maximum reconnect attempts provided in options, or 20 by default', async (done) => {
  options.shouldReconnect = () => true;
  options.reconnectAttempts = 3;
  options.reconnectInterval = 500; //Default interval is too long for tests
  const onReconnectStopFn = jest.fn((numAttempts: number) => {});
  options.onReconnectStop = onReconnectStopFn;

  renderHook(() => useWebSocket(URL, options));
  await server.connected;
  server.close();
  expect(onReconnectStopFn).not.toHaveBeenCalled();

  await sleep(2000);
  
  expect(onReconnectStopFn).toHaveBeenCalled();
  expect(onReconnectStopFn.mock.calls[0][0]).toBe(3);
  done();
});

test('Options#filter accepts all incoming messages, but only where it returns true will the message update a component', async (done) => {
  options.filter = () => false;

  const { result } = renderHook(() => useWebSocket(URL, options));
  await server.connected;
  server.send('Hello');
  await sleep(500);

  expect(result.current.lastMessage).toBeNull();
  done();
});

test('Options#retryOnError controls whether a websocket should attempt to reconnect after an error event', async (done) => {
  options.retryOnError = false;
  options.reconnectAttempts = 3;
  options.reconnectInterval = 500;
  const onReconnectStopFn1 = jest.fn();
  options.onReconnectStop = onReconnectStopFn1;

  renderHook(() => useWebSocket(URL, options));
  await server.connected;

  server.error();
  await sleep(1600);
  expect(onReconnectStopFn1).not.toHaveBeenCalled();

  options.retryOnError = true;
  const onReconnectStopFn2 = jest.fn();
  options.onReconnectStop = onReconnectStopFn2;

  renderHook(() => useWebSocket(URL, options));
  await server.connected;

  server.error();
  await sleep(1600);
  expect(onReconnectStopFn2).toHaveBeenCalled();
  done();
});

test('Options#eventSourceOptions, if provided, instantiates an EventSource instead of a WebSocket', async (done) => {
  options.eventSourceOptions = { withCredentials: true };

  const {
    result,
    waitForNextUpdate
  } = renderHook(() => useWebSocket(URL, options));
  await waitForNextUpdate();

  expect(result.current.getWebSocket() instanceof EventSource).toBe(true);

  done();
});

//TODO: Write companion tests for useSocketIO