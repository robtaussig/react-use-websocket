import { useMemo } from 'react'
import { useWebSocket } from './use-websocket'
import { DEFAULT_OPTIONS } from './constants'

const emptyEvent = {
  type: 'empty',
  payload: null,
}

const getSocketData = (event) => {
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

export const useSocketIO = (url, options = DEFAULT_OPTIONS) => {
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
