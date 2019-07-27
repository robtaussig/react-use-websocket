import { useMemo } from 'react'
import { useWebSocket } from './use-websocket'
import { DEFAULT_OPTIONS } from './constants'
import { Options, Message } from './use-websocket';

interface EmptyEvent {
  type: string,
  payload: any
}

const emptyEvent: EmptyEvent = {
  type: 'empty',
  payload: null,
}

const getSocketData = (event: Message) => {
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

export const useSocketIO = (url: string, options: Options = DEFAULT_OPTIONS) => {
  const optionsWithSocketIO = useMemo(() => ({
    ...options,
    fromSocketIO: true,
  }), [])

  const [ sendMessage, lastMessage, readyStateFromUrl ] = useWebSocket(
    url,
    optionsWithSocketIO,
  )

  return [
    sendMessage,
    useMemo(() => getSocketData(lastMessage), [lastMessage]),
    readyStateFromUrl,
  ]
}
