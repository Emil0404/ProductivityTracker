# Productivity Tracker

Eine moderne Flask-Web-App zur Messung deiner Produktivität mit präziser Stoppuhr, Session-Tracking und visuellen Auswertungen.

## Features

- Millisekunden-genaue Stoppuhr (`HH:MM:SS.mmm`)
- Start, Pause/Fortsetzen und Stop
- Automatisches Session-Tracking in `localStorage`
- Interaktives Dashboard im Darkmode
- KPIs:
  - Gesamtzeit heute
  - Sessions heute
  - Durchschnittliche Sessiondauer
  - Streak in Tagen
- Diagramme:
  - Kategorienverteilung als Kreisdiagramm
  - Daily Fokuszeit (umschaltbar 7/14/30 Tage)
- Session-Verwaltung:
  - Einzelne Session löschen
  - Alle Sessions löschen
- Kategorien:
  - Eigene Kategorien anlegen
  - Farbe pro Kategorie festlegen
  - Sessions einer aktiven Kategorie zuordnen
- Responsive Layout für Desktop und Mobile
- Keyboard-Shortcuts:
  - `Space`: Start / Pause / Fortsetzen
  - `S`: Stop

## Tech Stack

- Python 3
- Flask
- HTML, CSS, JavaScript (Vanilla)
- Chart.js

## Projektstruktur

```text
Productivity_Tracker/
├─ app.py
├─ requirements.txt
├─ start.sh
├─ static/
│  ├─ style.css
│  └─ script.js
└─ templates/
   └─ index.html
```

## Lokales Setup

### 1) Repository klonen

```bash
git clone https://github.com/Emil0404/ProductivityTracker
cd ProductivityTracker
```

### 2) Virtuelle Umgebung erstellen

```bash
python -m venv .venv
```

### 3) Virtuelle Umgebung aktivieren

**Linux/macOS**

```bash
source .venv/bin/activate
```

**Windows (PowerShell)**

```powershell
.venv\Scripts\Activate.ps1
```

### 4) Abhängigkeiten installieren

```bash
pip install -r requirements.txt
```

### 5) App starten

```bash
python app.py
```

Danach ist die App unter `http://127.0.0.1:5000` erreichbar.

## Replit Setup

Für Replit ist bereits `start.sh` vorbereitet. Das Script:

1. erstellt `.venv` (falls noch nicht vorhanden),
2. aktiviert die Umgebung,
3. installiert alle Requirements,
4. startet die App.

Start in Replit:

```bash
bash start.sh
```

Hinweis: `app.py` ist für Replit angepasst (`host=0.0.0.0` und `PORT`-Support).

## Datenhaltung

- Sessions werden clientseitig in `localStorage` gespeichert.
- Es ist keine Datenbank notwendig.
- Beim Löschen von Browserdaten gehen die gespeicherten Sessions verloren.
