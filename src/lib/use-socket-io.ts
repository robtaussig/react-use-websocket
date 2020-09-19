import { useMemo } from 'react'
import { useWebSocket } from './use-websocket'
import { DEFAULT_OPTIONS } from './constants'
import { Options, WebSocketHook } from './types';

export interface SocketIOMessageData {
  type: string,
  payload: any,
}

const emptyEvent: SocketIOMessageData = {
  type: 'empty',
  payload: null,
}

const getSocketData = (event: WebSocketEventMap['message'] | null): SocketIOMessageData => {
  if (!event || !event.data) {
    return emptyEvent
  }

  const match = event.data.match(/\[.*]/)

  if (!match) {
    return emptyEvent
  }

  const data = JSON.parse(match)

  if (!Array.isArray(data) || !data[1]) {
    return emptyEvent
  }

  return {
    type: data[0],
    payload: data[1],
  }
}

export const useSocketIO = (
  url: string | (() => string | Promise<string>) | null,
  options: Options = DEFAULT_OPTIONS,
  connect: boolean = true,
): WebSocketHook<SocketIOMessageData> => {
  const optionsWithSocketIO = useMemo(() => ({
    ...options,
    fromSocketIO: true,
  }), [])

  const {
    sendMessage,
    sendJsonMessage,
    lastMessage,
    readyState,
    getWebSocket,
  } = useWebSocket(

    url,
    optionsWithSocketIO,
    connect,
  );

  const socketIOLastMessage = useMemo(() =>
    getSocketData(lastMessage), [lastMessage]);

  return {
    sendMessage,
    sendJsonMessage,
    lastMessage: socketIOLastMessage,
    lastJsonMessage: socketIOLastMessage,
    readyState,
    getWebSocket,
  };
}
