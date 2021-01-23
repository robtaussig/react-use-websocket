import { renderHook, act } from '@testing-library/react-hooks';
import { useWebSocket } from './use-websocket';
import { MutableRefObject } from 'react';
import { createOrJoinSocket } from './create-or-join';
import WS from "jest-websocket-mock";
import { Options, Subscriber, WebSocketHook } from './types';
import { ReadyState } from './constants';
import { sharedWebSockets } from './globals';
import { addSubscriber, removeSubscriber, getSubscribers, hasSubscribers } from './manage-subscribers';

let server: WS;
let URL = 'ws://localhost:1234';
const noop = () => {};
const noopRef = { current: noop };
const DEFAULT_OPTIONS: Options = {};
let options: Options;
const sleep = (duration: number): Promise<void> => new Promise(resolve => setTimeout(() => resolve(), duration));
console.error = noop;

beforeEach(() => {
  server = new WS(URL);
  options = DEFAULT_OPTIONS;
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

//TODO: Test different option configurations
//TODO: Write companion tests for useSocketIO