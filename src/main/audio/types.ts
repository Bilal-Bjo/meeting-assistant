export interface AudioDevice {
  id: string
  name: string
  isDefault: boolean
  isInput: boolean
  sampleRate: number
  channels: number
}

export interface AudioCaptureOptions {
  deviceId?: string
  sampleRate?: number
  channels?: number
  bufferSize?: number
}

export interface AudioCaptureCallback {
  (samples: Float32Array, peakLevel: number): void
}

export interface AudioCapture {
  start(callback: AudioCaptureCallback): void
  stop(): void
  setMuted(muted: boolean): void
}

