import type { FileAnalysis, ProgressMessage, WSMessage } from '../types'
import { useCallback, useEffect, useReducer, useRef } from 'react'

interface WebSocketState {
  isConnected: boolean
  progress: ProgressMessage | null
  results: FileAnalysis[]
  error: string | null
}

type WebSocketAction
  = | { type: 'CONNECTED' }
    | { type: 'DISCONNECTED' }
    | { type: 'ERROR', message: string }
    | { type: 'PROGRESS', message: ProgressMessage }
    | { type: 'COMPLETE', results: FileAnalysis[] }

function wsReducer(state: WebSocketState, action: WebSocketAction): WebSocketState {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, isConnected: true, error: null }
    case 'DISCONNECTED':
      return { ...state, isConnected: false }
    case 'ERROR':
      return { ...state, error: action.message }
    case 'PROGRESS':
      return { ...state, progress: action.message }
    case 'COMPLETE':
      return { ...state, progress: null, results: action.results }
    default:
      return state
  }
}

interface UseWebSocketReturn extends WebSocketState {
  reconnect: () => void
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [state, dispatch] = useReducer(wsReducer, {
    isConnected: false,
    progress: null,
    results: [],
    error: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      dispatch({ type: 'CONNECTED' })
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      dispatch({ type: 'DISCONNECTED' })

      // Attempt to reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 2000)
    }

    ws.onerror = (event) => {
      console.error('WebSocket error:', event)
      dispatch({ type: 'ERROR', message: 'WebSocket connection error' })
    }

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)

        switch (message.type) {
          case 'progress':
            dispatch({ type: 'PROGRESS', message })
            break
          case 'complete':
            dispatch({ type: 'COMPLETE', results: message.results })
            break
          case 'error':
            dispatch({ type: 'ERROR', message: message.message })
            break
        }
      }
      catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }
  }, [url])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    const ws = wsRef.current
    wsRef.current = null // Clear reference to avoid reconnect loops on unmount
    ws?.close()
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    ...state,
    reconnect: connect,
  }
}
