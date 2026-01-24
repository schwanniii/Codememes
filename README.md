# Codenames — Mini Demo

In alleBegriffe.txt:
- Schwanni (Z. 313)
- Maris (Z. 209)
- Ben (Z. 33)
- Jacob (Z. 149)
- Johnny (Z. 151)
- Simon (Z. 319)
- Tim-Oke (Z. 354)
- Aaron (Z. 1)
- Mika (Z. 218)


Dies ist ein Minimal-Scaffold für eine Codenames-ähnliche Web-App mit einer Video-Picker-Demo.

Struktur:
- `backend/` - Express mock-API mit `/api/videos`
- `frontend/` - Vite + React Demo, zeigt die Videos vom Backend

Lokal starten (getrennt in zwei Terminals):

1) Backend

```powershell


cd "D:\JS-VSCode\in Bearbeitung\Codenames\backend"
npm install
npm start


```

2) Frontend

```powershell


cd "D:\JS-VSCode\in Bearbeitung\Codenames\frontend"
npm install
$env:VITE_SOCKET_URL = "http://localhost:3000"
npm run dev


```

Die Demo ruft `http://localhost:3000/api/videos` ab; achte darauf, dass das Backend auf Port 3000 läuft.

Nächste Schritte:
- Realtime (Socket.IO) stub hinzufügen
- echte Video-API-Integration (Pexels/Pixabay) mit Caching
- Spiel-Engine (Wort-Grid, Teams, Runden)

Deploy auf Render (gratis) — Ein Web Service
---------------------------------------------
Viel einfacher: Backend und Frontend in EINEM Service. Das Backend serviert die gebauten Frontend-Dateien statisch.

1) Repository pushen

```powershell
git init
git add .
git commit -m "Initial codenames demo scaffold"
git branch -M main
git remote add origin <GIT_REPO_URL>
git push -u origin main
```

2) In Render UI: Web Service erstellen
- Wähle dein GitHub-Repo
- **Build Command:** `cd backend && npm run build && npm install`  
  (Das baut das Frontend und installiert dann Backend-Dependencies)
- **Start Command:** `cd backend && npm start`  
  (Startet den Backend-Server, der auch die Frontend-Dateien serviert)

3) Deploy & Domain
- Render startet den Build und Deploy automatisch
- Nach dem Deploy erhältst du eine öffentliche URL (z. B. `https://codenames-xyz.onrender.com`)
- Die App ist dann auf dieser URL live — alles in einem Service!

Hinweise
- Der Backend-Server setzt `PORT` automatisch von Render (via `process.env.PORT`)
- Socket.IO läuft auf derselben Domain wie das Frontend, also keine CORS-Probleme
- Lokal kannst du immer noch mit zwei Terminals testen (`cd backend && npm start` und `cd frontend && npm run dev`)

Nächste Schritte (Codenames-Features)
- echte Video-API-Integration (Pexels/Pixabay) mit Suche
- Spiel-Engine (Wort-Grid, Teams, Runden)
- Persistente Datenbank (PostgreSQL auf Render)

