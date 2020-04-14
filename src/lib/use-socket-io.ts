import { useMemo } from 'react'
import { useWebSocket } from './use-websocket'
import { DEFAULT_OPTIONS, ReadyState } from './constants'
import { Options, SendMessage } from './types';

export interface SocketIOMessageData {
  type: string,
  payload: any,
}

const emptyEvent: SocketIOMessageData = {
  type: 'empty',
  payload: null,
}

const getSocketData = (event: WebSocketEventMap['message']): SocketIOMessageData => {
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
  url: () => Promise<string> | string,
  options: Options = DEFAULT_OPTIONS,
): [SendMessage, SocketIOMessageData, ReadyState, () => WebSocket] => {
  const optionsWithSocketIO = useMemo(() => ({
    ...options,
    fromSocketIO: true,
  }), [])

  const [ sendMessage, lastMessage, readyStateFromUrl, getWebSocket ] = useWebSocket(
    url,
    optionsWithSocketIO,
  )

  return [
    sendMessage,
    useMemo(() => getSocketData(lastMessage), [lastMessage]),
    readyStateFromUrl,
    getWebSocket,
  ]
}
