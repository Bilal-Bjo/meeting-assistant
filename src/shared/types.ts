export interface Session {
  id: string
  title: string
  created_at: string
  duration_sec: number
  merged_transcript?: string
  summary?: SessionSummary
  action_items?: SessionActionItems
}

export interface SessionSummary {
  title?: string
  summary?: string
  key_points?: string[]
  decisions?: string[]
  topics?: string[]
  participants_mentioned?: string[]
}

export interface SessionActionItems {
  action_items?: ActionItem[]
  follow_ups?: string[]
  open_questions?: string[]
}

export interface ActionItem {
  task: string
  owner: string
  deadline?: string | null
  priority: 'high' | 'medium' | 'low'
  context?: string
  completed?: boolean
}

export interface MeetingChat {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface TranscriptSegment {
  id: string
  session_id: string
  speaker: 'you' | 'lead'
  text: string
  start_ms: number
  end_ms?: number
}

export interface AudioDevice {
  id: string
  name: string
  isDefault: boolean
  isInput: boolean
}

export interface Settings {
  openai_api_key: string
  realtime_model: string
  feedback_model: string
  language?: 'en' | 'nl' | 'fr'
  irl_mode?: boolean
  mic_device_id?: string
  system_audio_device_id?: string
  desktop_source_id?: string
  system_audio_mode: 'blackhole' | 'wasapi' | 'loopback'
}

export interface RealtimeEvent {
  type: 'transcript' | 'transcript_delta' | 'error' | 'connected' | 'disconnected' | 'status'
  stage?: 'idle' | 'starting' | 'connecting' | 'listening' | 'transcribing'
  message?: string
  speaker?: 'you' | 'lead'
  text?: string
  error?: string
}

export type AppView = 'sessions' | 'in-call' | 'settings' | 'meeting-detail'
