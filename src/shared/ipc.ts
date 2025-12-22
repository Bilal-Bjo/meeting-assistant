import type { Session, TranscriptSegment, Settings, AudioDevice, RealtimeEvent, MeetingChat } from './types'

export const IPC_CHANNELS = {
  DB_GET_SESSIONS: 'db:get-sessions',
  DB_GET_SESSION: 'db:get-session',
  DB_CREATE_SESSION: 'db:create-session',
  DB_UPDATE_SESSION: 'db:update-session',
  DB_DELETE_SESSION: 'db:delete-session',
  DB_GET_TRANSCRIPT_SEGMENTS: 'db:get-transcript-segments',
  DB_ADD_TRANSCRIPT_SEGMENT: 'db:add-transcript-segment',
  DB_SET_SUMMARY: 'db:set-summary',
  DB_SET_ACTION_ITEMS: 'db:set-action-items',
  DB_GET_MEETING_CHATS: 'db:get-meeting-chats',
  DB_ADD_MEETING_CHAT: 'db:add-meeting-chat',

  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  AUDIO_GET_DEVICES: 'audio:get-devices',
  AUDIO_START_CAPTURE: 'audio:start-capture',
  AUDIO_STOP_CAPTURE: 'audio:stop-capture',
  AUDIO_SET_MIC_MUTED: 'audio:set-mic-muted',
  AUDIO_PEAK_LEVEL: 'audio:peak-level',

  GET_PLATFORM: 'system:get-platform',
  GET_DESKTOP_SOURCES: 'system:get-desktop-sources',
  GET_MACOS_VERSION: 'system:get-macos-version',
  GET_APP_VERSION: 'system:get-app-version',
  GET_UPDATE_STATUS: 'system:get-update-status',
  CHECK_FOR_UPDATES: 'system:check-for-updates',
  INSTALL_UPDATE: 'system:install-update',
  UPDATE_AVAILABLE: 'system:update-available',

  REALTIME_CONNECT: 'realtime:connect',
  REALTIME_DISCONNECT: 'realtime:disconnect',
  REALTIME_EVENT: 'realtime:event',
  REALTIME_SEND_MIC_AUDIO: 'realtime:send-mic-audio',
  REALTIME_SEND_MIC_AUDIO_PCM16: 'realtime:send-mic-audio-pcm16',
  REALTIME_SEND_SYSTEM_AUDIO_PCM16: 'realtime:send-system-audio-pcm16',

  CALL_START: 'call:start',
  CALL_END: 'call:end',
  CALL_IMPORT_TRANSCRIPT: 'call:import-transcript',
  CALL_FINALIZE_STATUS: 'call:finalize-status',

  // New channels for Supabase-based flow
  POST_CALL_PROCESS: 'call:post-call-process',
  POST_CALL_RESULT: 'call:post-call-result',

  MEETING_CHAT_SEND: 'meeting:chat-send',
  MEETING_CHAT_SEND_WITH_CONTEXT: 'meeting:chat-send-with-context',
  MEETING_CHAT_DELTA: 'meeting:chat-delta',
  MEETING_CHAT_RESPONSE: 'meeting:chat-response',
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]

export interface DesktopSource {
  id: string
  name: string
  thumbnail: string
}

export interface IpcApi {
  db: {
    getSessions(): Promise<Session[]>
    getSession(id: string): Promise<Session | null>
    createSession(title: string): Promise<Session>
    updateSession(id: string, updates: Partial<Session>): Promise<void>
    deleteSession(id: string): Promise<void>
    getTranscriptSegments(sessionId: string): Promise<TranscriptSegment[]>
    addTranscriptSegment(segment: Omit<TranscriptSegment, 'id'>): Promise<TranscriptSegment>
    setSummary(sessionId: string, summary: Session['summary']): Promise<void>
    setActionItems(sessionId: string, actionItems: Session['action_items']): Promise<void>
    getMeetingChats(sessionId: string): Promise<MeetingChat[]>
    addMeetingChat(chat: Omit<MeetingChat, 'id' | 'created_at'>): Promise<MeetingChat>
  }
  settings: {
    get(): Promise<Settings>
    set(settings: Partial<Settings>): Promise<void>
  }
  system: {
    getPlatform(): Promise<string>
    getDesktopSources(): Promise<DesktopSource[]>
    getMacOSVersion(): Promise<{ version: string; major: number } | null>
    getAppVersion(): Promise<string>
    getUpdateStatus(): Promise<{ available: boolean; version?: string; downloading?: boolean; downloaded?: boolean; checking?: boolean; lastChecked?: number; error?: string; releaseNotes?: string }>
    checkForUpdates(): Promise<void>
    installUpdate(): Promise<void>
    onUpdateAvailable(callback: (info: { version: string; releaseNotes?: string }) => void): () => void
  }
  audio: {
    getDevices(): Promise<AudioDevice[]>
    startCapture(micDeviceId?: string, systemDeviceId?: string): Promise<void>
    stopCapture(): Promise<void>
    setMicMuted(muted: boolean): Promise<void>
    onPeakLevel(callback: (level: { mic: number; system: number }) => void): () => void
  }
  realtime: {
    connect(sessionId: string): Promise<void>
    disconnect(): Promise<void>
    sendMicAudio(sessionId: string, samples: Float32Array): void
    sendMicAudioPcm16(sessionId: string, pcm16: Int16Array): void
    sendSystemAudioPcm16(sessionId: string, pcm16: Int16Array): void
    onEvent(callback: (event: RealtimeEvent) => void): () => void
  }
  call: {
    start(): Promise<Session>
    end(sessionId: string): Promise<void>
    importTranscript(transcript: string): Promise<Session>
    onFinalizeStatus(callback: (status: { sessionId: string; stage: string; error?: string }) => void): () => void
    processPostCall(meetingId: string, transcript: string): Promise<void>
    onPostCallResult(callback: (data: { meetingId: string; summary: unknown; actionItems: unknown; error?: string }) => void): () => void
  }
  meetingChat: {
    send(sessionId: string, message: string): Promise<void>
    sendWithContext(meetingId: string, message: string, context: { transcript?: string; summary?: unknown; actionItems?: unknown; chatHistory: Array<{ role: string; content: string }> }): Promise<void>
    onDelta(callback: (data: { meetingId: string; text: string }) => void): () => void
    onResponse(callback: (data: { meetingId: string; text: string; error?: string }) => void): () => void
  }
}

declare global {
  interface Window {
    api: IpcApi
  }
}
