# Meeting Recorder

AI-powered meeting transcription, summarization, and action item extraction.

## Features

- **Real-time Transcription** - Live audio transcription using OpenAI Realtime API
- **Meeting Summary** - AI-generated executive summary with key points and decisions
- **Action Items** - Automatic extraction with checkboxes, owners, deadlines, priorities
- **Chat with Meeting** - Ask questions about the meeting content
- **Import Transcript** - Paste any transcript to analyze (no recording needed)
- **IRL & Online Mode** - In-person (mic only) or online meetings (mic + system audio)
- **Multi-language** - English, Dutch, French support
- **Analytics** - Track meeting frequency, duration, and action item completion

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron + React + TypeScript |
| Audio Transcription | OpenAI Realtime API (WebSocket) |
| AI Analysis | OpenAI GPT-4o / GPT-4o-mini |
| Database | SQLite (better-sqlite3) |
| UI | Framer Motion + Recharts |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API Key

1. Run the app: `npm run dev`
2. Go to Settings → AI Models
3. Enter your OpenAI API key

### 3. Audio Setup

| Platform | System Audio Support |
|----------|---------------------|
| **macOS 13+** (Ventura/Sonoma/Sequoia) | ✅ Native - no setup needed |
| **macOS < 13** | Requires [BlackHole](https://existential.audio/blackhole/) |
| **Windows** | ✅ Native - select screen/window in Settings |

On macOS 13+, system audio is captured automatically via ScreenCaptureKit when you start an online meeting (non-IRL mode).

## Usage

### Recording a Meeting

1. Toggle **IRL** if in-person (mic only) or leave off for online (mic + system audio)
2. Click **New Meeting**
3. Recording starts automatically
4. Click **End** when done

### Import a Transcript

Don't want to record? Click **Import** to paste any meeting transcript and get:
- AI-generated summary
- Extracted action items
- Chat functionality

### Post-Meeting Analysis

After ending or importing, the app generates:

| Tab | Content |
|-----|---------|
| **Summary** | Overview, key points, decisions, participants |
| **Transcript** | Full transcript with speaker labels |
| **Action Items** | Checklist with owner, deadline, priority |
| **Chat** | Ask questions about the meeting |

## Development

```bash
npm run dev      # Start development
npm run build    # Build for production
npm run package  # Package for distribution
```

## Architecture

```
src/
├── main/              # Electron main process
│   ├── database.ts    # SQLite operations
│   ├── settings.ts    # App settings
│   ├── realtime/      # OpenAI Realtime API
│   ├── meeting-chat.ts
│   └── jobs/          # Post-meeting AI analysis
├── renderer/          # React frontend
│   └── pages/
│       ├── Sessions.tsx     # Meeting list + import
│       ├── InCall.tsx       # Recording view
│       ├── MeetingDetail.tsx # Analysis view
│       ├── Settings.tsx
│       └── Analytics.tsx
└── shared/            # Types & IPC
```
