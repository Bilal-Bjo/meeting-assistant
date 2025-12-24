import { contextBridge, ipcRenderer } from 'electron'

const IPC_CHANNELS = {
  // Note: DB_* channels removed - renderer uses Supabase directly
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  GET_PLATFORM: 'system:get-platform',
  GET_DESKTOP_SOURCES: 'system:get-desktop-sources',
  GET_MACOS_VERSION: 'system:get-macos-version',
  GET_APP_VERSION: 'system:get-app-version',
  GET_UPDATE_STATUS: 'system:get-update-status',
  CHECK_FOR_UPDATES: 'system:check-for-updates',
  INSTALL_UPDATE: 'system:install-update',
  UPDATE_AVAILABLE: 'system:update-available',
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
  POST_CALL_PROCESS: 'call:post-call-process',
  POST_CALL_RESULT: 'call:post-call-result',
  MEETING_CHAT_SEND: 'meeting:chat-send',
  MEETING_CHAT_SEND_WITH_CONTEXT: 'meeting:chat-send-with-context',
  MEETING_CHAT_DELTA: 'meeting:chat-delta',
  MEETING_CHAT_RESPONSE: 'meeting:chat-response',
} as const

const api = {
  // Note: db API removed - renderer uses Supabase directly
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    set: (settings: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),
  },
  system: {
    getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PLATFORM),
    getDesktopSources: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DESKTOP_SOURCES),
    getMacOSVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MACOS_VERSION),
    getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),
    getUpdateStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_UPDATE_STATUS),
    checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_FOR_UPDATES),
    installUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.INSTALL_UPDATE),
    onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string }) => void) => {
      const handler = (_: unknown, info: { version: string; releaseNotes?: string }) => callback(info)
      ipcRenderer.on(IPC_CHANNELS.UPDATE_AVAILABLE, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_AVAILABLE, handler)
    },
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
    // New methods for Supabase flow
    processPostCall: (meetingId: string, transcript: string) => ipcRenderer.invoke(IPC_CHANNELS.POST_CALL_PROCESS, meetingId, transcript),
    onPostCallResult: (callback: (data: { meetingId: string; summary: unknown; actionItems: unknown; error?: string }) => void) => {
      const handler = (_: unknown, data: { meetingId: string; summary: unknown; actionItems: unknown; error?: string }) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.POST_CALL_RESULT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.POST_CALL_RESULT, handler)
    },
  },
  meetingChat: {
    send: (sessionId: string, message: string) => ipcRenderer.invoke(IPC_CHANNELS.MEETING_CHAT_SEND, sessionId, message),
    sendWithContext: (meetingId: string, message: string, context: { transcript?: string; summary?: unknown; actionItems?: unknown; chatHistory: Array<{ role: string; content: string }> }) =>
      ipcRenderer.invoke(IPC_CHANNELS.MEETING_CHAT_SEND_WITH_CONTEXT, meetingId, message, context),
    onDelta: (callback: (data: { meetingId: string; text: string }) => void) => {
      const handler = (_: unknown, data: { meetingId: string; text: string }) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.MEETING_CHAT_DELTA, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MEETING_CHAT_DELTA, handler)
    },
    onResponse: (callback: (data: { meetingId: string; text: string; error?: string }) => void) => {
      const handler = (_: unknown, data: { meetingId: string; text: string; error?: string }) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.MEETING_CHAT_RESPONSE, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MEETING_CHAT_RESPONSE, handler)
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
