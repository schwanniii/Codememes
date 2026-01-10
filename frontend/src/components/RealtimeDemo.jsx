import React, { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

export default function RealtimeDemo() {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [room, setRoom] = useState('demo-room')
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')

  useEffect(() => {
    const socket = io(SERVER)
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('systemMessage', (msg) => setMessages((m) => [...m, { system: true, text: msg.text }]))
    socket.on('chatMessage', (msg) => setMessages((m) => [...m, { id: msg.id, text: msg.text }]))

    return () => {
      socket.disconnect()
    }
  }, [])

  function join() {
    socketRef.current.emit('joinRoom', { room })
  }

  function leave() {
    socketRef.current.emit('leaveRoom', { room })
  }

  function send() {
    if (!text) return
    socketRef.current.emit('chatMessage', { room, text })
    setText('')
  }

  return (
    <div style={{ margin: '16px 0', padding: 12, background: '#fff', borderRadius: 8 }}>
      <h3>Realtime-Demo</h3>
      <div style={{ marginBottom: 8 }}>
        Status: <strong>{connected ? 'connected' : 'disconnected'}</strong>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={room} onChange={(e) => setRoom(e.target.value)} />
        <button onClick={join}>Join</button>
        <button onClick={leave}>Leave</button>
      </div>

      <div style={{ maxHeight: 160, overflow: 'auto', border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ fontSize: 14, padding: '4px 0' }}>
            {m.system ? <em>{m.text}</em> : <span><strong>{m.id.slice(0,6)}</strong>: {m.text}</span>}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} />
        <button onClick={send}>Send</button>
      </div>
    </div>
  )
}
