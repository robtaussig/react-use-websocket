import { heartbeat } from "./heartbeat";

describe("heartbeat", () => {
  let ws: WebSocket;
  let sendSpy: jest.Mock;
  let closeSpy: jest.Mock;
  let addEventListenerSpy: jest.Mock;
  jest.useFakeTimers();

  beforeEach(() => {
    sendSpy = jest.fn();
    closeSpy = jest.fn();
    addEventListenerSpy = jest.fn();
    ws = {
      send: sendSpy,
      close: closeSpy,
      addEventListener: addEventListenerSpy,
    } as unknown as WebSocket;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("sends a ping message at the specified interval", () => {
    heartbeat(ws, { interval: 100 });
    expect(sendSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(99);
    expect(sendSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(100);
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  test("closes the WebSocket if onMessageCb is not invoked within the specified timeout", () => {
    heartbeat(ws, { timeout: 100 });
    expect(closeSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(99);
    expect(closeSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  test("does not close the WebSocket if messageCallback is invoked within the specified timeout", () => {
    const onMessageCb = heartbeat(ws, { timeout: 100 });
    expect(closeSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(99);
    onMessageCb();
    expect(closeSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  test("sends the custom ping message", () => {
    heartbeat(ws, { message: "pong" });
    expect(sendSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(25000);
    expect(sendSpy).toHaveBeenCalledWith("pong");
  });
});
