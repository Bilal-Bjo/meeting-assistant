import { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer, session } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { IPC_CHANNELS } from '../shared/ipc'
import { settingsStore } from './settings'
import * as audio from './audio'
import * as realtime from './realtime'
import * as summarize from './jobs/summarize'
import * as meetingChat from './meeting-chat'

let mainWindow: BrowserWindow | null = null
let activeSessionId: string | null = null

// Update status tracking
let updateStatus: {
  available: boolean
  version?: string
  downloading?: boolean
  downloaded?: boolean
  checking?: boolean
  lastChecked?: number
  error?: string
  releaseNotes?: string
} = { available: false }

const isDev = !app.isPackaged && process.env.NODE_ENV === 'development'

if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('enable-features', 'MacLoopbackAudioForScreenShare,MacSckSystemAudioLoopbackOverride')
}

function createWindow() {
  const isMac = process.platform === 'darwin'

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#161616',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    ...(isMac && { trafficLightPosition: { x: 16, y: 16 } }),
    autoHideMenuBar: true,
    frame: !isMac, // Show frame on Windows/Linux
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
    autoUpdater.autoDownload = true

    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...')
      updateStatus.checking = true
    })

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version)
      updateStatus = {
        available: true,
        version: info.version,
        downloading: true,
        downloaded: false,
        checking: false,
        lastChecked: Date.now(),
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, {
          version: info.version,
          releaseNotes: updateStatus.releaseNotes
        })
      }
    })

    autoUpdater.on('update-not-available', () => {
      console.log('Update not available')
      updateStatus = {
        available: false,
        checking: false,
        lastChecked: Date.now()
      }
    })

    autoUpdater.on('download-progress', (progress) => {
      console.log(`Download progress: ${progress.percent.toFixed(1)}%`)
      updateStatus.downloading = true
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded, installing now...')
      updateStatus = {
        available: true,
        version: info.version,
        downloading: false,
        downloaded: true,
        checking: false,
        lastChecked: Date.now(),
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : updateStatus.releaseNotes
      }
      // Auto-install after a short delay
      setTimeout(() => {
        autoUpdater.quitAndInstall()
      }, 1500)
    })

    autoUpdater.on('error', (err) => {
      console.error('Auto-updater error:', err)
      updateStatus = {
        ...updateStatus,
        checking: false,
        downloading: false,
        error: err.message
      }
    })

    // Initial check
    autoUpdater.checkForUpdates()

    // Check for updates every hour
    setInterval(() => {
      autoUpdater.checkForUpdates()
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
  // Note: DB_* handlers removed - renderer uses Supabase directly

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

  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
    return app.getVersion()
  })

  ipcMain.handle(IPC_CHANNELS.GET_UPDATE_STATUS, () => {
    return updateStatus
  })

  ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, async () => {
    if (isDev) {
      return
    }
    updateStatus.checking = true
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      updateStatus.checking = false
      updateStatus.error = (err as Error).message
    }
  })

  ipcMain.handle(IPC_CHANNELS.INSTALL_UPDATE, () => {
    if (updateStatus.downloaded) {
      autoUpdater.quitAndInstall()
    }
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
    // Legacy handler - kept for backwards compatibility
    console.warn('Using legacy MEETING_CHAT_SEND - switch to MEETING_CHAT_SEND_WITH_CONTEXT')
  })

  // New handler for Supabase-based flow
  ipcMain.handle(IPC_CHANNELS.MEETING_CHAT_SEND_WITH_CONTEXT, async (_, meetingId: string, message: string, context: { transcript?: string; summary?: unknown; actionItems?: unknown; chatHistory: Array<{ role: string; content: string }> }) => {
    return meetingChat.chatWithMeetingContext(meetingId, message, context)
  })

  // New handler for post-call processing (Supabase-based flow)
  ipcMain.handle(IPC_CHANNELS.POST_CALL_PROCESS, async (_, meetingId: string, transcript: string) => {
    return summarize.processPostCall(meetingId, transcript)
  })

  // Legacy handler - no longer used, renderer creates meetings via Supabase
  ipcMain.handle(IPC_CHANNELS.CALL_START, async () => {
    console.warn('CALL_START is deprecated - use Supabase flow')
    return null
  })

  // Legacy handler - no longer used, renderer handles call end via InCall.tsx
  ipcMain.handle(IPC_CHANNELS.CALL_END, async (_, sessionId: string) => {
    await audio.stopCapture()
    await realtime.disconnect()
    if (activeSessionId === sessionId) activeSessionId = null
  })

  // Legacy handler - no longer functional without local DB
  ipcMain.handle(IPC_CHANNELS.CALL_IMPORT_TRANSCRIPT, async () => {
    console.warn('CALL_IMPORT_TRANSCRIPT is deprecated - use Supabase flow')
    return null
  })
}
