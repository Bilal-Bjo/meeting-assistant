import WebSocket from 'ws'
import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import { settingsStore } from '../settings'
import type { RealtimeEvent } from '../../shared/types'

const REALTIME_URL = 'wss://api.openai.com/v1/realtime'
const MIN_CHUNK_SAMPLES = 480

const VALID_REALTIME_MODELS = [
  'gpt-4o-realtime-preview',
  'gpt-4o-realtime-preview-2024-12-17',
  'gpt-4o-mini-realtime-preview',
  'gpt-4o-mini-realtime-preview-2024-12-17',
]

function coerceRealtimeWsModel(model?: string): string {
  const m = (model || '').trim()
  if (VALID_REALTIME_MODELS.includes(m)) return m
  return 'gpt-4o-realtime-preview'
}

interface RealtimeClientOptions {
  sessionId: string
  speaker: 'you' | 'lead'
  model?: string
}

let clients: Map<string, RealtimeClient> = new Map()
let mainWindow: BrowserWindow | null = null
let connectInFlight: Map<string, Promise<void>> = new Map()

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window
}

export async function connect(sessionId: string): Promise<void> {
  const settings = settingsStore.get()
  
  if (!settings.openai_api_key) {
    emitEvent({ type: 'status', stage: 'idle', message: 'OpenAI API key missing' })
    emitEvent({ type: 'error', error: 'OpenAI API key not configured' })
    throw new Error('OpenAI API key not configured')
  }

  if (clients.has(`${sessionId}-mic`) || connectInFlight.has(sessionId)) {
    return connectInFlight.get(sessionId) ?? Promise.resolve()
  }

  emitEvent({ type: 'status', stage: 'connecting', message: 'Connecting…' })
  
  const micClient = new RealtimeClient({
    sessionId,
    speaker: 'you',
    model: settings.realtime_model,
  })

  clients.set(`${sessionId}-mic`, micClient)

  const isMacOS = process.platform === 'darwin'
  const hasDeviceId = Boolean(settings.system_audio_device_id || settings.desktop_source_id)
  const shouldConnectSystem = !settings.irl_mode && (hasDeviceId || isMacOS)
  
  const connectPromises: Promise<void>[] = [micClient.connect(settings.openai_api_key)]

  if (shouldConnectSystem) {
    const systemClient = new RealtimeClient({
      sessionId,
      speaker: 'lead',
      model: settings.realtime_model,
    })
    clients.set(`${sessionId}-system`, systemClient)
    connectPromises.push(systemClient.connect(settings.openai_api_key))
  }

  const p = Promise.all(connectPromises).then(() => {
    emitEvent({ type: 'connected' })
    emitEvent({ type: 'status', stage: 'listening', message: 'Recording' })
  }).finally(() => {
    connectInFlight.delete(sessionId)
  })

  connectInFlight.set(sessionId, p)
  await p
}

export async function disconnect(): Promise<void> {
  for (const client of clients.values()) {
    try {
      client.disconnect()
    } catch {
    }
  }
  clients.clear()
  connectInFlight.clear()
  emitEvent({ type: 'disconnected' })
}

export function sendMicAudio(sessionId: string, samples: Float32Array): void {
  const client = clients.get(`${sessionId}-mic`)
  client?.sendAudio(samples)
}

export function sendMicAudioPcm16(sessionId: string, pcm16: Int16Array): void {
  const client = clients.get(`${sessionId}-mic`)
  client?.sendAudioPcm16(pcm16)
}

export function sendSystemAudio(sessionId: string, samples: Float32Array): void {
  const client = clients.get(`${sessionId}-system`)
  client?.sendAudio(samples)
}

export function sendSystemAudioPcm16(sessionId: string, pcm16: Int16Array): void {
  const client = clients.get(`${sessionId}-system`)
  client?.sendAudioPcm16(pcm16)
}

export function isConnected(sessionId: string): boolean {
  const client = clients.get(`${sessionId}-mic`)
  return client?.getIsConnected() ?? false
}

function emitEvent(event: RealtimeEvent): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.REALTIME_EVENT, event)
  }
}

class RealtimeClient {
  private options: RealtimeClientOptions
  private ws: WebSocket | null = null
  private audioBuffer: Float32Array[] = []
  private totalSamples = 0
  private connected = false
  private partialTranscript = ''
  
  constructor(options: RealtimeClientOptions) {
    this.options = options
  }

  getIsConnected(): boolean {
    return this.connected
  }
  
  async connect(apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const model = coerceRealtimeWsModel(this.options.model)
      const url = `${REALTIME_URL}?model=${model}`
      
      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      })

      let settled = false
      
      this.ws.on('open', () => {
        this.connected = true
        this.sendSessionUpdate()
        settled = true
        resolve()
      })
      
      this.ws.on('message', (data) => {
        this.handleMessage(data.toString())
      })
      
      this.ws.on('error', (err) => {
        console.error('WebSocket error:', err)
        emitEvent({ type: 'error', error: err.message })
        if (!settled) {
          settled = true
          reject(err)
        }
      })
      
      this.ws.on('close', () => {
        this.connected = false
        if (!settled) {
          settled = true
          reject(new Error('WebSocket closed before connection established'))
        }
      })
    })
  }
  
  disconnect(): void {
    if (this.ws) {
      try {
        const state = this.ws.readyState
        if (state === WebSocket.CONNECTING) {
          this.ws.terminate()
        } else if (state === WebSocket.OPEN || state === WebSocket.CLOSING) {
          this.ws.close()
        }
      } catch {
      }
      this.ws = null
    }
    this.connected = false
    this.audioBuffer = []
    this.totalSamples = 0
    this.partialTranscript = ''
  }
  
  sendAudio(samples: Float32Array): void {
    if (!this.ws) return
    
    this.audioBuffer.push(samples)
    this.totalSamples += samples.length
    
    if (this.totalSamples >= MIN_CHUNK_SAMPLES) {
      this.flushAudioBuffer()
    }
  }

  sendAudioPcm16(pcm16: Int16Array): void {
    if (!this.ws || !this.connected) return
    
    const base64 = Buffer.from(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength).toString('base64')
    
    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64,
    }))
  }
  
  private flushAudioBuffer(): void {
    if (this.audioBuffer.length === 0 || !this.ws || !this.connected) return
    
    const merged = new Float32Array(this.totalSamples)
    let offset = 0
    for (const chunk of this.audioBuffer) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    
    const int16 = new Int16Array(merged.length)
    for (let i = 0; i < merged.length; i++) {
      const s = Math.max(-1, Math.min(1, merged[i]))
      int16[i] = s < 0 ? s * 32768 : s * 32767
    }
    
    const base64 = Buffer.from(int16.buffer).toString('base64')
    
    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64,
    }))
    
    this.audioBuffer = []
    this.totalSamples = 0
  }
  
  private sendSessionUpdate(): void {
    if (!this.ws) return
    
    const vadThreshold = this.options.speaker === 'lead' ? 0.12 : 0.25
    
    this.ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        modalities: ['text'],
        input_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: vadThreshold,
          prefix_padding_ms: 200,
          silence_duration_ms: 400,
          create_response: false,
        },
      },
    }))
  }
  
  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data)
      
      switch (event.type) {
        case 'input_audio_buffer.speech_started':
          emitEvent({ type: 'status', stage: 'transcribing', message: this.options.speaker === 'lead' ? 'Hearing participant…' : 'Hearing you…' })
          this.partialTranscript = ''
          break

        case 'input_audio_buffer.speech_stopped':
          emitEvent({ type: 'status', stage: 'transcribing', message: 'Processing…' })
          break

        case 'conversation.item.input_audio_transcription.delta':
          if (event.delta) {
            this.partialTranscript += event.delta
            emitEvent({
              type: 'transcript_delta',
              speaker: this.options.speaker,
              text: this.partialTranscript,
            })
          }
          break

        case 'conversation.item.input_audio_transcription.completed':
          if (event.transcript) {
            emitEvent({
              type: 'transcript',
              speaker: this.options.speaker,
              text: event.transcript,
            })
            emitEvent({ type: 'status', stage: 'listening', message: 'Recording' })
            this.partialTranscript = ''
          }
          break
          
        case 'error':
          console.error('Realtime API error:', event.error)
          emitEvent({ type: 'error', error: event.error?.message || 'Unknown error' })
          break
      }
    } catch (err) {
      console.error('Failed to parse realtime message:', err)
    }
  }
}
