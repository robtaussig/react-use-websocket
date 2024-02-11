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

test('readyState changes across readyState transitions', async () => {
  const {
    result,
    rerender,
  } = renderHook(({ initialValue }) => useWebSocket(URL, options, initialValue), {
    initialProps: { initialValue: false }
  })

  expect(result.current.readyState).toEqual(ReadyState.UNINSTANTIATED);
  rerender({ initialValue: true });

  expect(result.current.readyState).toEqual(ReadyState.CONNECTING);
  await server.connected;
  expect(result.current.readyState).toEqual(ReadyState.OPEN);

  server.close();
  await expect(result.current.readyState).toEqual(ReadyState.CLOSED);
})

test('a function-promise based url works the same as a string-based url', async () => {
  const getUrl = () => {
    return new Promise<string>(resolve => {
      setTimeout(() => resolve(URL), 1000);
    });
  }

  const {
    result,
    rerender,
  } = renderHook(({ initialValue }) => useWebSocket(getUrl, options, initialValue), {
    initialProps: { initialValue: false }
  })

  expect(result.current.readyState).toEqual(ReadyState.UNINSTANTIATED);
  rerender({ initialValue: true });

  expect(result.current.readyState).toEqual(ReadyState.CONNECTING);
  await server.connected;
  expect(result.current.readyState).toEqual(ReadyState.OPEN);

  server.close();
  await expect(result.current.readyState).toEqual(ReadyState.CLOSED);
})

test('a function-promise based url retries until it resolves if retryOnError is true', async () => {
  let attemptsUntilSuccess = 2;
  options.retryOnError = true;
  options.reconnectAttempts = 3;
  options.reconnectInterval = 500;
  const onReconnectStopFn1 = jest.fn();
  options.onReconnectStop = onReconnectStopFn1;

  const getUrl = () => {
    return new Promise<string>((resolve, reject) => {
      if (attemptsUntilSuccess > 0) {
        attemptsUntilSuccess--;
        reject('Failed to get url');
      } else {
        resolve(URL);
      }
    });
  };

  const {
    result,
    rerender,
  } = renderHook(({ initialValue }) => useWebSocket(getUrl, options, initialValue), {
    initialProps: { initialValue: false }
  });

  expect(result.current.readyState).toEqual(ReadyState.UNINSTANTIATED);
  rerender({ initialValue: true });
  await sleep(1000);
  expect(result.current.readyState).toEqual(ReadyState.CONNECTING);
  await sleep(1000);
  await expect(result.current.readyState).toEqual(ReadyState.OPEN);
  expect(options.onReconnectStop).not.toHaveBeenCalled();
});

test('a function-promise based url stops retrying if it has exceeded reconnectAttempts', async () => {
  let attemptsUntilSuccess = 3;
  options.retryOnError = true;
  options.reconnectAttempts = 2;
  options.reconnectInterval = 500;
  const onReconnectStopFn1 = jest.fn();
  options.onReconnectStop = onReconnectStopFn1;

  const getUrl = () => {
    return new Promise<string>((resolve, reject) => {
      if (attemptsUntilSuccess > 0) {
        attemptsUntilSuccess--;
        reject('Failed to get url');
      } else {
        resolve(URL);
      }
    });
  };

  const {
    result,
    rerender,
  } = renderHook(({ initialValue }) => useWebSocket(getUrl, options, initialValue), {
    initialProps: { initialValue: false }
  });

  expect(result.current.readyState).toEqual(ReadyState.UNINSTANTIATED);
  rerender({ initialValue: true });
  await sleep(1000);
  expect(result.current.readyState).toEqual(ReadyState.CONNECTING);
  await sleep(1000);
  await expect(result.current.readyState).toEqual(ReadyState.CLOSED);
  expect(options.onReconnectStop).toHaveBeenCalled();
});

test('a function-promise based url does not retry if retryOnError is false', async () => {
  let attemptsUntilSuccess = 2;
  options.retryOnError = false;
  options.reconnectAttempts = 3;
  options.reconnectInterval = 500;
  const onReconnectStopFn1 = jest.fn();
  options.onReconnectStop = onReconnectStopFn1;

  const getUrl = () => {
    return new Promise<string>((resolve, reject) => {
      if (attemptsUntilSuccess > 0) {
        attemptsUntilSuccess--;
        reject('Failed to get url');
      } else {
        resolve(URL);
      }
    });
  };

  const {
    result,
    rerender,
  } = renderHook(({ initialValue }) => useWebSocket(getUrl, options, initialValue), {
    initialProps: { initialValue: false }
  });

  expect(result.current.readyState).toEqual(ReadyState.UNINSTANTIATED);
  rerender({ initialValue: true });
  await sleep(1000);
  expect(result.current.readyState).toEqual(ReadyState.CLOSED);
  await sleep(1000);
  expect(options.onReconnectStop).not.toHaveBeenCalled();
});

test('lastMessage updates when websocket receives a message', async () => {
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
})

test('lastJsonMessage updates with a json object when websocket receives a message', async () => {
  const {
    result,
  } = renderHook(() => useWebSocket<{ name: string }>(URL, options))
  await server.connected;
  expect(result.current.lastJsonMessage).toBe(null);

  server.send(JSON.stringify({ name: 'Bob' }));
  expect(result.current.lastJsonMessage.name).toBe('Bob');
})

test('sendMessage passes message to websocket and sends to server', async () => {
  const {
    result,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  result.current.sendMessage("Hello");
  await expect(server).toReceiveMessage("Hello");
})

test('if sendMessage is called before the websocket opens, the message will be queued and sent when the websocket opens', async () => {
  const {
    result,
  } = renderHook(() => useWebSocket(URL, options))
  expect(result.current.readyState).not.toEqual(ReadyState.OPEN);
  result.current.sendMessage("Hello");
  await expect(server).toReceiveMessage("Hello");
})

test('sendJsonMessage allows component to pass a json object which is serialized and sent to server', async () => {
  const {
    result,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  result.current.sendJsonMessage({ name: 'Bob'  });

  await expect(server).toReceiveMessage(JSON.stringify({ name: 'Bob'  }));
})

test('getWebSocket returns the underlying websocket if unshared', async () => {
  const {
    result,
    waitFor
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  const ws = result.current.getWebSocket();

  expect(ws instanceof WebSocket).toBe(true);

  ws?.close();
  await waitFor(() => expect(result.current.readyState).toBe(ReadyState.CLOSED));
})

test('getWebSocket returns a protected websocket when shared', async () => {
  options.share = true;
  const {
    result,
  } = renderHook(() => useWebSocket(URL, options))
  await server.connected;
  const ws = result.current.getWebSocket();

  ws?.close();
  await expect(result.current.readyState).toBe(ReadyState.OPEN);
})

test('websocket is closed when the component unmounts', async () => {
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
})

test('shared websockets receive updates as if unshared', async () => {
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
})

test('shared websockets each have callbacks invoked as if unshared', async () => {
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
})

test('Options#fromSocketIO changes the WS url to support socket.io\'s required query params', async () => {
  options.fromSocketIO = true;

  const {
    result,
    waitFor
  } = renderHook(() => useWebSocket(URL, options));

  await waitFor(() => {
    const ws = result.current.getWebSocket();
    expect(ws?.url).toEqual(SOCKET_IO_URL);
  });
});

test('Options#queryParams append object-based params as string to url', async () => {
  options.queryParams = { type: 'user', id: 5 };

  const {
    result,
    waitFor,
  } = renderHook(() => useWebSocket(URL, options));

  await waitFor(() => {
    const ws = result.current.getWebSocket();
    expect(ws?.url).toEqual(`${URL}/?type=user&id=5`);
  });
});

test('Options#protocols pass the value on to the instantiated WebSocket', async () => {
  options.protocols = 'chat';

  const {
    result,
    waitFor,
  } = renderHook(() => useWebSocket(URL, options));

  await waitFor(() => {
    const ws = result.current.getWebSocket();
    if (ws instanceof WebSocket) {
      expect(ws?.protocol).toEqual('chat');
    }
  });
});

test('Options#share subscribes multiple components to a single WebSocket, so long as the URL is the same', async () => {
  options.share = true;
  
  const onConnectionFn = jest.fn();
  server.on('connection', onConnectionFn);

  renderHook(() => useWebSocket(URL, options));
  renderHook(() => useWebSocket(URL, options));
  renderHook(() => useWebSocket(URL, options));

  await sleep(500);

  expect(onConnectionFn).toHaveBeenCalledTimes(1);
});

test('if Options#share is not true, multiple websockets will be opened for the same url', async () => {
  const onConnectionFn = jest.fn();
  server.on('connection', onConnectionFn);

  renderHook(() => useWebSocket(URL, options));
  renderHook(() => useWebSocket(URL, options));
  renderHook(() => useWebSocket(URL, options));

  await sleep(500);

  expect(onConnectionFn).toHaveBeenCalledTimes(3);
});

test('Options#onOpen is called with the open event when the websocket connection opens', async () => {
  const onOpenFn = jest.fn();
  options.onOpen = onOpenFn;

  renderHook(() => useWebSocket(URL, options));
  await server.connected;
  expect(onOpenFn).toHaveBeenCalledTimes(1);
  expect(onOpenFn.mock.calls[0][0].constructor.name).toBe('Event');
});

test('Options#onClose is called with the close event when the websocket connection closes', async () => {
  const onCloseFn = jest.fn();
  options.onClose = onCloseFn;

  const { waitFor } = renderHook(() => useWebSocket(URL, options));
  await server.connected;

  server.close();
  await waitFor(() => {
    expect(onCloseFn).toHaveBeenCalledTimes(1);
    expect(onCloseFn.mock.calls[0][0].constructor.name).toBe('CloseEvent');
  });
});

test('Options#onMessage is called with the MessageEvent when the websocket receives a message', async () => {
  const onMessageFn = jest.fn();
  options.onMessage = onMessageFn;

  const { waitFor } = renderHook(() => useWebSocket(URL, options));
  await server.connected;
  
  server.send('Hello');

  await waitFor(() => {
    expect(onMessageFn).toHaveBeenCalledTimes(1);
    expect(onMessageFn.mock.calls[0][0].constructor.name).toBe('MessageEvent');
  });
});

test('Options#onError is called when the websocket connection errors out', async () => {
  const onErrorFn = jest.fn();
  options.onError = onErrorFn;

  const { waitFor } = renderHook(() => useWebSocket(URL, options));
  await server.connected;
  
  server.error();

  await waitFor(() => {
    expect(onErrorFn).toHaveBeenCalledTimes(1);
    expect(onErrorFn.mock.calls[0][0].constructor.name).toBe('MessageEvent');
  });
});

test('Options#shouldReconnect controls whether a closed websocket should attempt to reconnect', async () => {
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
});

test('Options#onReconnectStop is called when the websocket exceeds maximum reconnect attempts provided in options, or 20 by default', async () => {
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
});

test('Options#filter accepts all incoming messages, but only where it returns true will the message update a component', async () => {
  options.filter = () => false;

  const { result } = renderHook(() => useWebSocket(URL, options));
  await server.connected;
  server.send('Hello');
  await sleep(500);

  expect(result.current.lastMessage).toBeNull();
});

test('Options#retryOnError controls whether a websocket should attempt to reconnect after an error event', async () => {
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
});

test('Options#eventSourceOptions, if provided, instantiates an EventSource instead of a WebSocket', async () => {
  options.eventSourceOptions = { withCredentials: true };

  const {
    result,
    waitForNextUpdate
  } = renderHook(() => useWebSocket(URL, options));
  await waitForNextUpdate();

  expect(result.current.getWebSocket() instanceof EventSource).toBe(true);
});

test.each([false, true])('Options#heartbeat, if provided, sends a message to the server at the specified interval and works when share is %s', async (shareOption) => {
  options.heartbeat = {
    message: 'ping',
    timeout: 10000,
    interval: 500,
  };
  options.share = shareOption;

  renderHook(() => useWebSocket(URL, options));

  if (shareOption) {
    renderHook(() => useWebSocket(URL, options));
  }
  await server.connected;
  await sleep(1600);
  await expect(server).toHaveReceivedMessages(["ping", "ping", "ping"]);
});

test.each([false, true])('Options#heartbeat, if provided, close websocket if no message is received from server within specified timeout and works when share is %s', async (shareOption) => {
  options.heartbeat = {
    message: 'ping',
    timeout: 1000,
    interval: 500,
  };
  options.share = shareOption;

  const {
    result,
  } = renderHook(() => useWebSocket(URL, options));

  if (shareOption) {
    renderHook(() => useWebSocket(URL, options));
  }
  await server.connected;
  await sleep(1600);
  expect(result.current.readyState).toBe(WebSocket.CLOSED);
});

test.each([false, true])('Options#heartbeat, if provided, do not close websocket if a message is received from server within specified timeout and works when share is %s', async (shareOption) => {
  options.heartbeat = {
    message: 'ping',
    timeout: 1000,
    interval: 500,
  };
  options.share = shareOption;
  
  const {
    result,
  } = renderHook(() => useWebSocket(URL, options));

  if (shareOption) {
    renderHook(() => useWebSocket(URL, options));
  }
  
  await server.connected;
  server.send('ping')
  await sleep(500);
  server.send('ping')
  await sleep(500);
  server.send('ping')
  await sleep(500);
  server.send('ping')
  await sleep(500);
  expect(result.current.readyState).toBe(WebSocket.OPEN);
});

test.each([false, true])('Options#heartbeat, if provided, lastMessage is updated if server message does not matches the returnMessage property of heartbeatOptions and works when share is %s', async (shareOption) => {
  options.heartbeat = {
    message: 'ping',
    returnMessage: 'pong',
    timeout: 1000,
    interval: 500,
  };
  options.share = shareOption;

  const {
    result,
  } = renderHook(() => useWebSocket(URL, options));

  if (shareOption) {
    renderHook(() => useWebSocket(URL, options));
  }
  
  await server.connected;
  server.send('pong');
  expect(result.current.lastMessage?.data).toBe(undefined);
  server.send('ping');
  expect(result.current.lastMessage?.data).toBe('ping');
});

// //TODO: Write companion tests for useSocketIO
