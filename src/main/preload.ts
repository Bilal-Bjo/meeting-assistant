import { contextBridge, ipcRenderer } from 'electron'

const IPC_CHANNELS = {
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
  GET_PLATFORM: 'system:get-platform',
  GET_DESKTOP_SOURCES: 'system:get-desktop-sources',
  GET_MACOS_VERSION: 'system:get-macos-version',
  AUDIO_GET_DEVICES: 'audio:get-devices',
  AUDIO_START_CAPTURE: 'audio:start-capture',
  AUDIO_STOP_CAPTURE: 'audio:stop-capture',
  AUDIO_SET_MIC_MUTED: 'audio:set-mic-muted',
  AUDIO_PEAK_LEVEL: 'audio:peak-level',
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

const api = {
  db: {
    getSessions: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_SESSIONS),
    getSession: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_SESSION, id),
    createSession: (title: string) => ipcRenderer.invoke(IPC_CHANNELS.DB_CREATE_SESSION, title),
    updateSession: (id: string, updates: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.DB_UPDATE_SESSION, id, updates),
    deleteSession: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DB_DELETE_SESSION, id),
    getTranscriptSegments: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_TRANSCRIPT_SEGMENTS, sessionId),
    addTranscriptSegment: (segment: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.DB_ADD_TRANSCRIPT_SEGMENT, segment),
    setSummary: (sessionId: string, summary: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.DB_SET_SUMMARY, sessionId, summary),
    setActionItems: (sessionId: string, actionItems: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.DB_SET_ACTION_ITEMS, sessionId, actionItems),
    getMeetingChats: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_MEETING_CHATS, sessionId),
    addMeetingChat: (chat: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.DB_ADD_MEETING_CHAT, chat),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    set: (settings: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),
  },
  system: {
    getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PLATFORM),
    getDesktopSources: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DESKTOP_SOURCES),
    getMacOSVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MACOS_VERSION),
  },
  audio: {
    getDevices: () => ipcRenderer.invoke(IPC_CHANNELS.AUDIO_GET_DEVICES),
    startCapture: (micDeviceId?: string, systemDeviceId?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUDIO_START_CAPTURE, micDeviceId, systemDeviceId),
    stopCapture: () => ipcRenderer.invoke(IPC_CHANNELS.AUDIO_STOP_CAPTURE),
    setMicMuted: (muted: boolean) => ipcRenderer.invoke(IPC_CHANNELS.AUDIO_SET_MIC_MUTED, muted),
    onPeakLevel: (callback: (level: { mic: number; system: number }) => void) => {
      const handler = (_: unknown, level: { mic: number; system: number }) => callback(level)
      ipcRenderer.on(IPC_CHANNELS.AUDIO_PEAK_LEVEL, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AUDIO_PEAK_LEVEL, handler)
    },
  },
  realtime: {
    connect: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.REALTIME_CONNECT, sessionId),
    disconnect: () => ipcRenderer.invoke(IPC_CHANNELS.REALTIME_DISCONNECT),
    sendMicAudio: (sessionId: string, samples: Float32Array) => ipcRenderer.send(IPC_CHANNELS.REALTIME_SEND_MIC_AUDIO, sessionId, samples),
    sendMicAudioPcm16: (sessionId: string, pcm16: Int16Array) => ipcRenderer.send(IPC_CHANNELS.REALTIME_SEND_MIC_AUDIO_PCM16, sessionId, pcm16),
    sendSystemAudioPcm16: (sessionId: string, pcm16: Int16Array) => ipcRenderer.send(IPC_CHANNELS.REALTIME_SEND_SYSTEM_AUDIO_PCM16, sessionId, pcm16),
    onEvent: (callback: (event: Record<string, unknown>) => void) => {
      const handler = (_: unknown, event: Record<string, unknown>) => callback(event)
      ipcRenderer.on(IPC_CHANNELS.REALTIME_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.REALTIME_EVENT, handler)
    },
  },
  call: {
    start: () => ipcRenderer.invoke(IPC_CHANNELS.CALL_START),
    end: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.CALL_END, sessionId),
    importTranscript: (transcript: string) => ipcRenderer.invoke(IPC_CHANNELS.CALL_IMPORT_TRANSCRIPT, transcript),
    onFinalizeStatus: (callback: (status: { sessionId: string; stage: string; error?: string }) => void) => {
      const handler = (_: unknown, status: { sessionId: string; stage: string; error?: string }) => callback(status)
      ipcRenderer.on(IPC_CHANNELS.CALL_FINALIZE_STATUS, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.CALL_FINALIZE_STATUS, handler)
    },
  },
  meetingChat: {
    send: (sessionId: string, message: string) => ipcRenderer.invoke(IPC_CHANNELS.MEETING_CHAT_SEND, sessionId, message),
    onDelta: (callback: (data: { sessionId: string; text: string }) => void) => {
      const handler = (_: unknown, data: { sessionId: string; text: string }) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.MEETING_CHAT_DELTA, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MEETING_CHAT_DELTA, handler)
    },
    onResponse: (callback: (data: { sessionId: string; text: string; error?: string }) => void) => {
      const handler = (_: unknown, data: { sessionId: string; text: string; error?: string }) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.MEETING_CHAT_RESPONSE, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MEETING_CHAT_RESPONSE, handler)
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
