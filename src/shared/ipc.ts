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

  MEETING_CHAT_SEND: 'meeting:chat-send',
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
  }
  meetingChat: {
    send(sessionId: string, message: string): Promise<void>
    onDelta(callback: (data: { sessionId: string; text: string }) => void): () => void
    onResponse(callback: (data: { sessionId: string; text: string; error?: string }) => void): () => void
  }
}

declare global {
  interface Window {
    api: IpcApi
  }
}
