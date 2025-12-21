import { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer, session } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { IPC_CHANNELS } from '../shared/ipc'
import { initDatabase, db } from './database'
import { settingsStore } from './settings'
import * as audio from './audio'
import * as realtime from './realtime'
import * as summarize from './jobs/summarize'
import * as meetingChat from './meeting-chat'

let mainWindow: BrowserWindow | null = null
let activeSessionId: string | null = null

const isDev = !app.isPackaged && process.env.NODE_ENV === 'development'

if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('enable-features', 'MacLoopbackAudioForScreenShare,MacSckSystemAudioLoopbackOverride')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#161616',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  audio.setMainWindow(mainWindow)
  realtime.setMainWindow(mainWindow)
  summarize.setMainWindow(mainWindow)
  meetingChat.setMainWindow(mainWindow)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  initDatabase()
  registerIpcHandlers()
  createWindow()

  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 }
    })
    
    if (sources.length > 0) {
      console.log('[display-media] Auto-selecting first source:', sources[0].name)
      callback({ video: sources[0], audio: 'loopback' })
    } else {
      console.error('[display-media] No sources available')
      callback({})
    }
  })

  globalShortcut.register('CommandOrControl+Alt+I', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools()
    }
  })

  // Auto-updater configuration
  if (!isDev) {
    autoUpdater.logger = console
    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('update-available', () => {
      console.log('Update available, downloading...')
    })

    autoUpdater.on('update-downloaded', () => {
      console.log('Update downloaded, will install on quit')
      // Optionally notify user via IPC
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded')
      }
    })

    // Check for updates every hour
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify()
    }, 60 * 60 * 1000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.DB_GET_SESSIONS, () => {
    return db.getSessions()
  })

  ipcMain.handle(IPC_CHANNELS.DB_GET_SESSION, (_, id: string) => {
    return db.getSession(id)
  })

  ipcMain.handle(IPC_CHANNELS.DB_CREATE_SESSION, (_, title: string) => {
    return db.createSession(title)
  })

  ipcMain.handle(IPC_CHANNELS.DB_UPDATE_SESSION, (_, id: string, updates: Record<string, unknown>) => {
    return db.updateSession(id, updates)
  })

  ipcMain.handle(IPC_CHANNELS.DB_DELETE_SESSION, (_, id: string) => {
    return db.deleteSession(id)
  })

  ipcMain.handle(IPC_CHANNELS.DB_GET_TRANSCRIPT_SEGMENTS, (_, sessionId: string) => {
    return db.getTranscriptSegments(sessionId)
  })

  ipcMain.handle(IPC_CHANNELS.DB_ADD_TRANSCRIPT_SEGMENT, (_, segment: Omit<import('../shared/types').TranscriptSegment, 'id'>) => {
    return db.addTranscriptSegment(segment)
  })

  ipcMain.handle(IPC_CHANNELS.DB_SET_SUMMARY, (_, sessionId: string, summary: Record<string, unknown>) => {
    return db.setSummary(sessionId, summary)
  })

  ipcMain.handle(IPC_CHANNELS.DB_SET_ACTION_ITEMS, (_, sessionId: string, actionItems: Record<string, unknown>) => {
    return db.setActionItems(sessionId, actionItems)
  })

  ipcMain.handle(IPC_CHANNELS.DB_GET_MEETING_CHATS, (_, sessionId: string) => {
    return db.getMeetingChats(sessionId)
  })

  ipcMain.handle(IPC_CHANNELS.DB_ADD_MEETING_CHAT, (_, chat: Record<string, unknown>) => {
    return db.addMeetingChat(chat as Omit<import('../shared/types').MeetingChat, 'id' | 'created_at'>)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return settingsStore.get()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_, settings: Record<string, unknown>) => {
    return settingsStore.set(settings)
  })

  ipcMain.handle(IPC_CHANNELS.AUDIO_GET_DEVICES, async () => {
    return audio.getAudioDevices()
  })

  ipcMain.handle(IPC_CHANNELS.GET_PLATFORM, () => {
    return process.platform
  })

  ipcMain.handle(IPC_CHANNELS.GET_DESKTOP_SOURCES, async () => {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 }
    })
    return sources.map(s => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL()
    }))
  })

  ipcMain.handle(IPC_CHANNELS.GET_MACOS_VERSION, () => {
    if (process.platform !== 'darwin') return null
    const release = process.getSystemVersion()
    const major = parseInt(release.split('.')[0], 10)
    
    let macOSMajor = major
    let displayVersion = release
    if (major >= 22) {
      macOSMajor = major - 9
      displayVersion = `${macOSMajor}.0`
    }
    
    return { version: displayVersion, major: macOSMajor }
  })

  ipcMain.handle(IPC_CHANNELS.AUDIO_START_CAPTURE, async (_, micDeviceId?: string, systemDeviceId?: string) => {
    return audio.startCapture(micDeviceId, systemDeviceId)
  })

  ipcMain.handle(IPC_CHANNELS.AUDIO_STOP_CAPTURE, async () => {
    return audio.stopCapture()
  })

  ipcMain.handle(IPC_CHANNELS.AUDIO_SET_MIC_MUTED, (_, muted: boolean) => {
    audio.setMicMuted(muted)
  })

  ipcMain.handle(IPC_CHANNELS.REALTIME_CONNECT, async (_, sessionId: string) => {
    return realtime.connect(sessionId)
  })

  ipcMain.handle(IPC_CHANNELS.REALTIME_DISCONNECT, async () => {
    return realtime.disconnect()
  })

  ipcMain.on(IPC_CHANNELS.REALTIME_SEND_MIC_AUDIO, (_event, sessionId: string, samples: Float32Array) => {
    realtime.sendMicAudio(sessionId, samples)
  })

  ipcMain.on(IPC_CHANNELS.REALTIME_SEND_MIC_AUDIO_PCM16, (_event, sessionId: string, pcm16: Int16Array) => {
    realtime.sendMicAudioPcm16(sessionId, pcm16)
  })

  ipcMain.on(IPC_CHANNELS.REALTIME_SEND_SYSTEM_AUDIO_PCM16, (_event, sessionId: string, pcm16: Int16Array) => {
    realtime.sendSystemAudioPcm16(sessionId, pcm16)
  })

  ipcMain.handle(IPC_CHANNELS.MEETING_CHAT_SEND, async (_, sessionId: string, message: string) => {
    return meetingChat.chatWithMeeting(sessionId, message)
  })

  ipcMain.handle(IPC_CHANNELS.CALL_START, async () => {
    const title = `Meeting ${new Date().toLocaleString()}`
    const session = db.createSession(title)
    activeSessionId = session.id
    
    void (async () => {
      try {
        const settings = settingsStore.get()
        if (!settings.openai_api_key) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(IPC_CHANNELS.REALTIME_EVENT, { type: 'error', error: 'OpenAI API key not configured' })
          }
          return
        }
        await realtime.connect(session.id)
      } catch (err) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC_CHANNELS.REALTIME_EVENT, { type: 'error', error: (err as Error).message })
        }
      }
    })()

    return session
  })

  ipcMain.handle(IPC_CHANNELS.CALL_END, async (_, sessionId: string) => {
    await audio.stopCapture()
    await realtime.disconnect()
    if (activeSessionId === sessionId) activeSessionId = null
    
    const session = db.getSession(sessionId)
    const segments = db.getTranscriptSegments(sessionId)
    
    let transcript = ''
    if (segments.length > 0) {
      transcript = segments
        .sort((a, b) => a.start_ms - b.start_ms)
        .map(s => `${s.speaker === 'you' ? 'You' : 'Participant'}: ${s.text}`)
        .join('\n')
    } else if (session?.merged_transcript) {
      transcript = session.merged_transcript
    }
    
    if (transcript) {
      summarize.enqueuePostCallJob(sessionId, transcript)
    } else {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.CALL_FINALIZE_STATUS, {
          sessionId,
          stage: 'complete',
        })
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CALL_IMPORT_TRANSCRIPT, async (_, transcript: string) => {
    const session = db.createSession('Imported Meeting')
    db.updateSession(session.id, { merged_transcript: transcript })
    summarize.enqueuePostCallJob(session.id, transcript)
    return db.getSession(session.id)
  })
}
