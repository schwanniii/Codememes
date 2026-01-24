import React, { useState } from 'react';

const GIPHY_API_KEY = "WOBF4g1aprBjQUbFMjRlH7Jgu55JZfFJ"; 

export default function GifPicker({ onGifSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchGifs = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);

    // Giphy API URL
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=25&rating=g&lang=de`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      
      if (data && data.data) {
        setResults(data.data);
      }
    } catch (err) {
      console.error("Giphy Fehler:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', width: '260px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', gap: '5px' }}>
        <input 
          type="text" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
          placeholder="GIF suchen..."
          style={{ padding: '6px', width: '80%', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', color: '#000' }}
        />
        <button 
          onClick={searchGifs} 
          disabled={isSearching}
          style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: '4px', background: '#f0f0f0', border: '1px solid #ccc' }}
        >
          {isSearching ? '...' : '🔍'}
        </button>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '8px', 
        marginTop: '10px', 
        maxHeight: '180px', 
        overflowY: 'auto' 
      }}>
        {results.map((gif) => (
          <img 
            key={gif.id} 
            src={gif.images.fixed_height_small.url} 
            onClick={() => onGifSelect(gif.images.original.url)}
            style={{ 
              width: '100%', 
              height: '80px', 
              objectFit: 'cover', 
              cursor: 'pointer', 
              borderRadius: '4px',
              transition: 'transform 0.1s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            alt="giphy result"
          />
        ))}
      </div>
      <div style={{ fontSize: '9px', color: '#999', marginTop: '5px', textAlign: 'right' }}>Powered by GIPHY</div>
    </div>
  );
}