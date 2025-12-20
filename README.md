# Meeting Recorder

AI-powered meeting transcription, summarization, and action item extraction.

## Features

- **Real-time Transcription** - Live audio transcription using OpenAI Realtime API
- **Meeting Summary** - AI-generated executive summary with key points and decisions
- **Action Items** - Automatic extraction of tasks, owners, deadlines, and priorities
- **Chat with Meeting** - Ask questions about the meeting content
- **IRL & Online Mode** - Support for in-person (mic only) and online meetings (mic + system audio)
- **Multi-language** - English, Dutch, French support
- **Analytics** - Track meeting frequency, duration, and action items over time

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

#### macOS 13+ (Ventura, Sonoma, Sequoia)
- Native support via ScreenCaptureKit
- No additional software needed
- System audio captured automatically in online mode

#### macOS < 13
- Requires [BlackHole](https://existential.audio/blackhole/) virtual audio device
- Select "BlackHole 2ch" in Settings → Audio

#### Windows
- Native support via desktop loopback
- Select screen/window to capture in Settings → Audio

## Usage

### Recording a Meeting

1. Toggle **IRL** mode if in-person (mic only) or leave off for online (mic + system audio)
2. Click **New Meeting**
3. Recording starts automatically
4. Click **End** when done

### Post-Meeting Analysis

After ending a meeting, the app automatically generates:

- **Summary Tab** - Overview, key points, decisions made, participants
- **Transcript Tab** - Full transcript with speaker labels
- **Action Items Tab** - Tasks with owner, deadline, priority, context
- **Chat Tab** - Ask questions about the meeting

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

## Architecture

```
meeting-app/
├── src/
│   ├── main/           # Electron main process
│   │   ├── database.ts # SQLite operations
│   │   ├── settings.ts # App settings
│   │   ├── realtime/   # OpenAI Realtime API (transcription)
│   │   ├── meeting-chat.ts # Chat with meeting feature
│   │   └── jobs/       # Post-meeting analysis
│   ├── renderer/       # React frontend
│   │   └── pages/
│   │       ├── Sessions.tsx    # Meeting list
│   │       ├── InCall.tsx      # Recording view
│   │       ├── MeetingDetail.tsx # Post-meeting analysis
│   │       ├── Settings.tsx    # Configuration
│   │       └── Analytics.tsx   # Statistics
│   └── shared/         # Shared types
```
