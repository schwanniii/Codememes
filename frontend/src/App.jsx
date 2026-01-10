import React, { useEffect, useState } from 'react'
import VideoGrid from './components/VideoGrid'
import RealtimeDemo from './components/RealtimeDemo'

export default function App() {
  const [videos, setVideos] = useState([])

  useEffect(() => {
    fetch('http://localhost:3000/api/videos')
      .then((res) => res.json())
      .then((data) => setVideos(data))
      .catch((err) => console.error('Video fetch error', err))
  }, [])

  return (
    <div style={{ maxWidth: 1000, margin: '24px auto', fontFamily: 'sans-serif' }}>
      <h1>Codenames — Video Picker Demo</h1>
      <p>Dies ist eine kleine Demo: wähle ein Video aus der freien Auswahl.</p>
      <RealtimeDemo />
      <VideoGrid videos={videos} />
    </div>
  )
}
