import React from 'react'

export default function VideoGrid({ videos }) {
  if (!videos || videos.length === 0) return <p>Keine Videos gefunden (Starte Backend und aktualisiere).</p>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 16 }}>
      {videos.map((v) => (
        <div key={v.id} style={{ border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>{v.title}</div>
          <video
            width="100%"
            height="140"
            controls
            poster={v.thumbnail}
            src={v.videoUrl}
            style={{ background: '#000' }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{v.source}</div>
        </div>
      ))}
    </div>
  )
}
