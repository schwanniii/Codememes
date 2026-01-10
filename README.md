# Codenames — Mini Demo

Dies ist ein Minimal-Scaffold für eine Codenames-ähnliche Web-App mit einer Video-Picker-Demo.

Struktur:
- `backend/` - Express mock-API mit `/api/videos`
- `frontend/` - Vite + React Demo, zeigt die Videos vom Backend

Lokal starten (getrennt in zwei Terminals):

1) Backend

```powershell
cd "backend"
npm install
npm start
```

2) Frontend

```powershell
cd "frontend"
npm install
npm run dev
```

Die Demo ruft `http://localhost:3000/api/videos` ab; achte darauf, dass das Backend auf Port 3000 läuft.

Nächste Schritte:
- Realtime (Socket.IO) stub hinzufügen
- echte Video-API-Integration (Pexels/Pixabay) mit Caching
- Spiel-Engine (Wort-Grid, Teams, Runden)

Deploy auf Render (gratis)
-------------------------
Kurzüberblick: Wir deployen zwei Services — das Backend als "web service" und das Frontend als "static site".

1) Repository pushen

```powershell
git init
git add .
git commit -m "Initial codenames demo scaffold"
git branch -M main
git remote add origin <GIT_REPO_URL>
git push -u origin main
```

2) render.yaml verwenden (optional)
- Die Datei `render.yaml` im Repo enthält ein Beispiel-Manifest für Render. Ersetze `<GIT_REPO_URL>` und passe Namen an.

3) Backend (auf Render)
- Erstelle einen neuen Service vom Typ "Web Service" (Node), wähle dein Git-Repo und Branch.
- Build Command: `cd backend && npm install`
- Start Command: `cd backend && npm start`
- Render setzt `PORT` automatisch; unser Server verwendet `process.env.PORT`.

4) Frontend (auf Render)
- Erstelle eine neue "Static Site" in Render, wähle dein Repo und Branch.
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/dist`
- Setze eine Umgebungsvariable `VITE_SOCKET_URL` auf die öffentliche Backend-URL (z. B. `https://codenames-backend.onrender.com`).

Hinweis zu Umgebungsvariablen
- `VITE_`-Variablen werden zur Build-Zeit in Vite eingebettet. Setze `VITE_SOCKET_URL` im Render Static Site UI oder im `render.yaml`.

Beispiel: wenn dein Backend heißt `codenames-backend` auf Render, wäre `VITE_SOCKET_URL` z.B. `https://codenames-backend.onrender.com`.

CORS & Sicherheit
- Das Demo-Backend verwendet `cors()` (offen) für einfache Entwicklung; vor Public-Launch sollten die erlaubten Origins eingeschränkt werden.

