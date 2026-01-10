import React, { useState } from 'react'
import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SOCKET_URL || window.location.origin

export default function DiagnosticPanel() {
  const [results, setResults] = useState([])
  const [testing, setTesting] = useState(false)

  function log(label, status, message) {
    setResults((prev) => [...prev, { label, status, message, time: new Date().toLocaleTimeString() }])
  }

  async function runDiagnostics() {
    setResults([])
    setTesting(true)

    // Test 1: Health check
    try {
      const res = await fetch(`${SERVER}/api/health`)
      if (res.ok) {
        const data = await res.json()
        log('Health Check', 'OK', JSON.stringify(data))
      } else {
        log('Health Check', 'FAIL', `HTTP ${res.status}`)
      }
    } catch (err) {
      log('Health Check', 'ERROR', err.message)
    }

    // Test 2: Videos API
    try {
      const res = await fetch(`${SERVER}/api/videos`)
      if (res.ok) {
        const data = await res.json()
        log('Videos API', 'OK', `${data.length} videos loaded`)
      } else {
        log('Videos API', 'FAIL', `HTTP ${res.status}`)
      }
    } catch (err) {
      log('Videos API', 'ERROR', err.message)
    }

    // Test 3: WebSocket
    try {
      const socket = io(SERVER, { reconnection: false })

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000)

        socket.on('connect', () => {
          clearTimeout(timeout)
          log('WebSocket Connect', 'OK', `Socket ID: ${socket.id.slice(0, 8)}...`)

          // Test 4: Room join
          socket.emit('joinRoom', { room: 'diagnostic-test' })
          socket.once('systemMessage', (msg) => {
            log('WebSocket Join', 'OK', msg.text)
            socket.disconnect()
            resolve()
          })

          // Fallback
          setTimeout(() => {
            socket.disconnect()
            resolve()
          }, 2000)
        })

        socket.on('error', (err) => {
          clearTimeout(timeout)
          reject(err)
        })

        socket.on('connect_error', (err) => {
          clearTimeout(timeout)
          reject(err)
        })
      })
    } catch (err) {
      log('WebSocket', 'ERROR', err.message)
    }

    setTesting(false)
  }

  return (
    <div style={{ margin: '16px 0', padding: 12, background: '#f0f8ff', border: '1px solid #4a90e2', borderRadius: 8 }}>
      <h3 style={{ margin: '0 0 8px 0' }}>🔧 Diagnostic Panel</h3>
      <p style={{ margin: 0, fontSize: 12, color: '#666', marginBottom: 8 }}>
        Teste Backend-APIs und WebSocket-Verbindung
      </p>

      <button
        onClick={runDiagnostics}
        disabled={testing}
        style={{
          padding: '8px 16px',
          background: '#4a90e2',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: testing ? 'not-allowed' : 'pointer',
          marginBottom: 12,
          opacity: testing ? 0.6 : 1
        }}
      >
        {testing ? 'Testing...' : 'Run Diagnostic'}
      </button>

      <div style={{ maxHeight: 200, overflow: 'auto', background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 4 }}>
        {results.length === 0 ? (
          <p style={{ color: '#999', margin: 0 }}>Keine Tests durchgeführt.</p>
        ) : (
          results.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 50px 1fr 80px',
                gap: 8,
                padding: '6px 0',
                borderBottom: i < results.length - 1 ? '1px solid #eee' : 'none',
                fontSize: 12
              }}
            >
              <div style={{ fontWeight: 600 }}>{r.label}</div>
              <div
                style={{
                  color: r.status === 'OK' ? '#0c8f2f' : r.status === 'ERROR' ? '#e74c3c' : '#e67e22',
                  fontWeight: 600
                }}
              >
                {r.status}
              </div>
              <div style={{ color: '#444', wordBreak: 'break-all' }}>{r.message}</div>
              <div style={{ color: '#999' }}>{r.time}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
        ✅ Alle Tests OK? → Bereit, das Spiel zu programmieren!
        <br />
        ❌ Fehler? → Schau in Browser-DevTools (F12) nach Network/Console-Fehlern.
      </div>
    </div>
  )
}
