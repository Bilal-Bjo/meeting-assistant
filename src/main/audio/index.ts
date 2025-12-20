import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { AudioDevice, AudioCaptureCallback, AudioCaptureOptions } from './types'

let micCapture: AudioInputStream | null = null
let systemCapture: AudioInputStream | null = null
let micMuted = false
let currentWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow) {
  currentWindow = window
}

export async function getAudioDevices(): Promise<AudioDevice[]> {
  const devices: AudioDevice[] = [
    {
      id: 'default',
      name: 'System Default Microphone',
      isDefault: true,
      isInput: true,
      sampleRate: 24000,
      channels: 1,
    },
  ]
  
  if (process.platform === 'darwin') {
    devices.push({
      id: 'blackhole',
      name: 'BlackHole 2ch (System Audio)',
      isDefault: false,
      isInput: true,
      sampleRate: 48000,
      channels: 2,
    })
  }
  
  return devices
}

export async function startCapture(
  micDeviceId?: string,
  systemDeviceId?: string,
  onMicAudio?: AudioCaptureCallback,
  onSystemAudio?: AudioCaptureCallback
): Promise<void> {
  await stopCapture()
  
  micCapture = new AudioInputStream({
    deviceId: micDeviceId,
    sampleRate: 24000,
    channels: 1,
  })
  
  micCapture.start((samples, peak) => {
    if (!micMuted && onMicAudio) {
      onMicAudio(samples, peak)
    }
    emitPeakLevel('mic', micMuted ? 0 : peak)
  })
  
  systemCapture = new AudioInputStream({
    deviceId: systemDeviceId,
    sampleRate: 24000,
    channels: 1,
  })
  
  systemCapture.start((samples, peak) => {
    if (onSystemAudio) {
      onSystemAudio(samples, peak)
    }
    emitPeakLevel('system', peak)
  })
}

export async function stopCapture(): Promise<void> {
  if (micCapture) {
    micCapture.stop()
    micCapture = null
  }
  if (systemCapture) {
    systemCapture.stop()
    systemCapture = null
  }
}

export function setMicMuted(muted: boolean): void {
  micMuted = muted
}

function emitPeakLevel(source: 'mic' | 'system', level: number): void {
  if (currentWindow && !currentWindow.isDestroyed()) {
    const data = source === 'mic' 
      ? { mic: level, system: 0 } 
      : { mic: 0, system: level }
    currentWindow.webContents.send(IPC_CHANNELS.AUDIO_PEAK_LEVEL, data)
  }
}

class AudioInputStream {
  private options: AudioCaptureOptions
  private callback: AudioCaptureCallback | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  
  constructor(options: AudioCaptureOptions = {}) {
    this.options = {
      sampleRate: 24000,
      channels: 1,
      bufferSize: 2400,
      ...options,
    }
  }
  
  start(callback: AudioCaptureCallback): void {
    this.callback = callback
    const bufferSize = this.options.bufferSize!
    
    this.intervalId = setInterval(() => {
      const samples = new Float32Array(bufferSize)
      for (let i = 0; i < bufferSize; i++) {
        samples[i] = (Math.random() - 0.5) * 0.02
      }
      const peak = Math.max(...Array.from(samples).map(Math.abs))
      this.callback?.(samples, peak)
    }, 100)
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.callback = null
  }
}
