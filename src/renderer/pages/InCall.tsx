import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PhoneOff, Mic, MicOff, Circle } from 'lucide-react'
import type { Session, RealtimeEvent, Settings as SettingsType } from '@shared/types'

interface Props {
  session: Session
  onEndCall: () => void
}

export function InCall({ session, onEndCall }: Props) {
  const [isMuted, setIsMuted] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [statusText, setStatusText] = useState('Starting…')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [segmentCount, setSegmentCount] = useState(0)
  
  const startTimeRef = useRef(Date.now())
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const systemWorkletNodeRef = useRef<AudioWorkletNode | null>(null)
  const mutedRef = useRef(false)
  const settingsRef = useRef<SettingsType | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.realtime.onEvent((event: RealtimeEvent) => {
      if (event.type === 'transcript' && event.text && event.speaker) {
        const now = Date.now()
        const startMs = Math.max(0, now - startTimeRef.current)
        window.api.db.addTranscriptSegment({
          session_id: session.id,
          speaker: event.speaker,
          text: event.text,
          start_ms: startMs,
          end_ms: startMs,
        })
        setSegmentCount(c => c + 1)
      } else if (event.type === 'connected') {
        setIsConnected(true)
        setStatusText('Recording')
        setErrorText(null)
      } else if (event.type === 'disconnected') {
        setIsConnected(false)
        setStatusText('Disconnected')
      } else if (event.type === 'status' && event.message) {
        setStatusText(event.message)
      } else if (event.type === 'error') {
        setErrorText(event.error || 'Error')
      }
    })

    setStatusText('Starting audio…')
    void (async () => {
      settingsRef.current = await window.api.settings.get()
      await startMicCapture(session.id)
    })()

    return () => {
      unsubscribe()
      stopMicCapture()
    }
  }, [session.id])

  async function startMicCapture(sessionId: string): Promise<void> {
    try {
      const settings = settingsRef.current
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: settings?.mic_device_id ? { deviceId: { exact: settings.mic_device_id } } : true,
      })
      mediaStreamRef.current = stream
      const ctx = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)

      const workletCode = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.buffer = []; this.bufferLength = 0 }
  process(inputs) {
    const input = inputs[0]?.[0]
    if (!input || input.length === 0) return true
    this.buffer.push(input.slice())
    this.bufferLength += input.length
    const ratio = sampleRate / 24000
    const samplesNeeded = Math.ceil(480 * ratio)
    while (this.bufferLength >= samplesNeeded) {
      const merged = new Float32Array(this.bufferLength)
      let offset = 0
      for (const chunk of this.buffer) { merged.set(chunk, offset); offset += chunk.length }
      const downsampled = this.downsample(merged.subarray(0, samplesNeeded), sampleRate)
      const pcm16 = new Int16Array(downsampled.length)
      for (let i = 0; i < downsampled.length; i++) {
        const s = Math.max(-1, Math.min(1, downsampled[i]))
        pcm16[i] = s < 0 ? s * 32768 : s * 32767
      }
      this.port.postMessage({ pcm16 }, [pcm16.buffer])
      const remaining = merged.subarray(samplesNeeded)
      this.buffer = remaining.length > 0 ? [remaining] : []
      this.bufferLength = remaining.length
    }
    return true
  }
  downsample(input, inRate) {
    if (inRate === 24000) return input.slice()
    const ratio = inRate / 24000
    const out = new Float32Array(Math.max(1, Math.floor(input.length / ratio)))
    for (let i = 0; i < out.length; i++) out[i] = input[Math.min(Math.floor(i * ratio), input.length - 1)]
    return out
  }
}
registerProcessor('pcm-processor', PCMProcessor)
`
      const blob = new Blob([workletCode], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)
      await ctx.audioWorklet.addModule(url)
      URL.revokeObjectURL(url)

      const workletNode = new AudioWorkletNode(ctx, 'pcm-processor')
      workletNodeRef.current = workletNode
      workletNode.port.onmessage = (e) => {
        if (mutedRef.current) return
        window.api.realtime.sendMicAudioPcm16(sessionId, e.data.pcm16)
      }
      source.connect(workletNode)
      workletNode.connect(ctx.destination)

      if (!settings?.irl_mode) {
        await setupSystemAudio(sessionId, ctx, settings)
      }

      setStatusText('Connecting…')
      await window.api.realtime.connect(sessionId)
    } catch (err) {
      setErrorText((err as Error).message)
    }
  }

  async function setupSystemAudio(sessionId: string, ctx: AudioContext, settings: SettingsType | null): Promise<void> {
    const platform = await window.api.system.getPlatform()
    const macVersion = await window.api.system.getMacOSVersion()
    
    try {
      if (platform === 'win32' && settings?.desktop_source_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = await (navigator.mediaDevices as any).getUserMedia({
          audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: settings.desktop_source_id } },
          video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: settings.desktop_source_id, maxWidth: 1, maxHeight: 1, maxFrameRate: 1 } }
        })
        for (const t of stream.getVideoTracks()) t.stop()
        systemStreamRef.current = stream
        connectSystemWorklet(sessionId, ctx, stream)
      } else if (platform === 'darwin' && macVersion && macVersion.major >= 13) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        for (const t of stream.getVideoTracks()) t.stop()
        if (stream.getAudioTracks().length > 0) {
          systemStreamRef.current = stream
          connectSystemWorklet(sessionId, ctx, stream)
        }
      } else if (settings?.system_audio_device_id) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: settings.system_audio_device_id } } })
        systemStreamRef.current = stream
        connectSystemWorklet(sessionId, ctx, stream)
      }
    } catch (e) {
      console.warn('[system-audio] Failed:', e)
    }
  }

  function connectSystemWorklet(sessionId: string, ctx: AudioContext, stream: MediaStream): void {
    const source = ctx.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(ctx, 'pcm-processor')
    systemWorkletNodeRef.current = node
    node.port.onmessage = (e) => {
      window.api.realtime.sendSystemAudioPcm16(sessionId, e.data.pcm16)
    }
    source.connect(node)
    node.connect(ctx.destination)
  }

  function stopMicCapture(): void {
    workletNodeRef.current?.disconnect()
    systemWorkletNodeRef.current?.disconnect()
    audioContextRef.current?.close()
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    systemStreamRef.current?.getTracks().forEach(t => t.stop())
    window.api.realtime.disconnect()
  }

  const handleMuteToggle = useCallback(() => {
    setIsMuted(m => { mutedRef.current = !m; return !m })
    window.api.audio.setMicMuted(!isMuted)
  }, [isMuted])

  const formatDuration = (s: number) => {
    const hrs = Math.floor(s / 3600)
    const mins = Math.floor((s % 3600) / 60)
    const secs = s % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#161616' }}
    >
      {/* Header */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 0 80px', borderBottom: '1px solid #27272a', WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {isConnected && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}
            />
          )}
          <span style={{ color: 'white', fontWeight: 500 }}>Recording</span>
          <span style={{ color: '#71717a', fontSize: 14 }}>{formatDuration(duration)}</span>
          <span style={{ color: '#a1a1aa', fontSize: 13 }}>{statusText}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={handleMuteToggle} style={{ height: 36, padding: '0 16px', background: isMuted ? '#dc2626' : '#27272a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={onEndCall} style={{ height: 36, padding: '0 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PhoneOff size={16} />
            End
          </button>
        </div>
      </div>

      {/* Main content - Recording indicator */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        
        {/* Big recording indicator */}
        <motion.div
          animate={isConnected ? { scale: [1, 1.1, 1], opacity: [1, 0.7, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: isConnected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(113, 113, 122, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `3px solid ${isConnected ? '#ef4444' : '#52525b'}`
          }}
        >
          <Circle size={48} fill={isConnected ? '#ef4444' : '#52525b'} color={isConnected ? '#ef4444' : '#52525b'} />
        </motion.div>

        {/* Duration */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 300, color: 'white', fontFamily: 'monospace' }}>
            {formatDuration(duration)}
          </div>
          <p style={{ color: '#71717a', fontSize: 14, marginTop: 8 }}>
            {segmentCount > 0 ? `${segmentCount} segments captured` : 'Waiting for speech…'}
          </p>
        </div>

        {/* Mode indicator */}
        <div style={{ 
          padding: '8px 16px', 
          background: '#18181b', 
          borderRadius: 8, 
          border: '1px solid #27272a',
          color: '#a1a1aa',
          fontSize: 13
        }}>
          {settingsRef.current?.irl_mode ? '🎤 In-person meeting (mic only)' : '💻 Online meeting (mic + system audio)'}
        </div>
      </div>

      {/* Error banner */}
      {errorText && (
        <div style={{ padding: '10px 20px', background: '#7f1d1d', color: '#fecaca', fontSize: 13 }}>
          {errorText}
        </div>
      )}
    </motion.div>
  )
}
