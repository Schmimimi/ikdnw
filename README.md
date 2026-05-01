# 🎮 QuizShow – Twitch Edition

Eine vollständige Web-App für eine interaktive Quizshow, live auf Twitch streambar.

---

## 🏗️ Architektur

```
quizshow/
├── backend/          # Node.js + Express + Socket.io
├── frontend/         # React + Vite + Tailwind + Framer Motion
├── database/         # Supabase SQL Schema
├── docker-compose.yml
└── .env.example
```

### 4 Interfaces
| URL | Zweck |
|-----|-------|
| `/` | Home – Twitch Login + Rollenwahl |
| `/admin` | Setup: Spieler, Kategorien, Fragen einpflegen |
| `/host/:sessionId` | Host-Panel: Spielsteuerung, Punktevergabe |
| `/player/:sessionId` | Spieler-Panel: Kamera + Spielstatus |
| `/overlay/:sessionId` | OBS-Overlay: 1920×1080, transparent |

---

## 🚀 Setup

### 1. Supabase einrichten
1. Neues Projekt auf [supabase.com](https://supabase.com) erstellen
2. SQL aus `database/schema.sql` im SQL-Editor ausführen
3. URL und Service-Key kopieren

### 2. Twitch-App erstellen
1. Auf [dev.twitch.tv/console](https://dev.twitch.tv/console) einloggen
2. Neue Anwendung erstellen
3. Redirect URI setzen: `https://api.yourdomain.com/api/auth/twitch/callback`
4. Client ID und Secret kopieren

### 3. Umgebungsvariablen
```bash
cp .env.example .env
# .env befüllen
```

### 4. Lokal entwickeln
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (neues Terminal)
cd frontend && npm install && npm run dev
```

### 5. Deployment auf Hetzner + Coolify
```bash
# In Coolify: Docker Compose Service erstellen
# Repository verbinden
# Env-Variablen aus .env.example befüllen
# Deploy!
```

---

## 🎬 Show-Ablauf

### Vorbereitung (Admin-Panel)
1. Session erstellen
2. 4 Spieler mit Twitch-Accounts eintragen (manuell, nach WhatsApp-Absprache)
3. Je 3 Kategorien pro Spieler anlegen + Zuweisung setzen
4. Fragen pro Kategorie einpflegen
5. Host-Fragen für das Finale anlegen

### Show-Ablauf
1. **LOBBY** – alle verbinden sich
2. **CATEGORY_REVEAL** – Kategorien-Animation → Host interviewt Spieler
3. **MAIN_ROUND** – Host wählt Kategorien, stellt Fragen, vergibt Punkte:
   - Fremder antwortet richtig: **400 Punkte** 🟢
   - Experte antwortet richtig: **100 Punkte** 🟣
   - Experte antwortet falsch, Fremder bekommt: **250 Punkte** 🟡
4. **FINALE** – Top 2 ins Superfinale, Best-of-5 mit 5-Kreis-Anzeige
5. **END** – Winner-Screen

### OBS-Setup
1. Browser-Source hinzufügen: `https://quizshow.yourdomain.com/overlay/SESSION_ID`
2. Größe: 1920×1080, Hintergrund transparent
3. Spieler öffnen `/player/SESSION_ID` in ihrem Browser → Kamera wird automatisch ins Overlay gestreamt

---

## 🎯 Punkte-System

| Situation | Punkte | Empfänger |
|-----------|--------|-----------|
| Fremder antwortet richtig | **400** | Fremder Spieler |
| Experte rettet (nach falschem Fremden) | **100** | Experte |
| Experte antwortet auch falsch | **250** | Fremder Spieler |

---

## 🔧 Tech Stack

- **Backend:** Node.js, Express, Socket.io (WebSockets für Echtzeit-Sync)
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Framer Motion
- **Kamera:** WebRTC via simple-peer (Browser-zu-Browser, kein Server-Relay)
- **Datenbank:** Supabase (PostgreSQL) – persistenter Spielstand
- **Auth:** Twitch OAuth 2.0
- **Deployment:** Docker + Coolify auf Hetzner
