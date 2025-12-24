import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Volume2, Cpu, Monitor, X, User, LogOut, Loader2, MessageSquare } from 'lucide-react'
import type { Settings as SettingsType } from '@shared/types'
import type { DesktopSource } from '@shared/ipc'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  onClose: () => void
  initialTab?: string
}

type Tab = 'account' | 'audio' | 'ai' | 'context'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'Account', icon: <User style={{ width: 18, height: 18 }} /> },
  { id: 'audio', label: 'Audio', icon: <Volume2 style={{ width: 18, height: 18 }} /> },
  { id: 'ai', label: 'AI Models', icon: <Cpu style={{ width: 18, height: 18 }} /> },
  { id: 'context', label: 'Context', icon: <MessageSquare style={{ width: 18, height: 18 }} /> },
]

function MacOSAudioSection({ 
  settings, 
  inputDevices, 
  handleChange 
}: { 
  settings: SettingsType
  inputDevices: { id: string; name: string }[]
  handleChange: <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => void 
}) {
  const [macVersion, setMacVersion] = useState<{ version: string; major: number } | null>(null)
  
  useEffect(() => {
    window.api.system.getMacOSVersion().then(setMacVersion)
  }, [])
  
  const supportsSCK = macVersion && macVersion.major >= 13
  const versionName = macVersion?.major === 13 ? 'Ventura' 
    : macVersion?.major === 14 ? 'Sonoma' 
    : macVersion?.major === 15 ? 'Sequoia'
    : macVersion?.major && macVersion.major > 15 ? 'or newer'
    : ''
  
  return (
    <>
      {supportsSCK ? (
        <div style={{ 
          padding: 16, 
          background: 'rgba(34, 197, 94, 0.1)', 
          borderRadius: 8, 
          border: '1px solid rgba(34, 197, 94, 0.2)',
          marginBottom: 16
        }}>
          <p style={{ fontSize: 14, color: '#22c55e', margin: 0, fontWeight: 500 }}>
            ✓ Native audio capture available
          </p>
          <p style={{ fontSize: 13, color: '#a1a1aa', margin: '8px 0 0 0', lineHeight: 1.5 }}>
            macOS {macVersion.version} {versionName} supports ScreenCaptureKit. 
            When you start an online meeting (IRL mode off), system audio from your primary screen 
            will be captured automatically — this includes audio from Zoom, Meet, Teams, etc.
          </p>
        </div>
      ) : (
        <div style={{ 
          padding: 16, 
          background: 'rgba(251, 191, 36, 0.1)', 
          borderRadius: 8, 
          border: '1px solid rgba(251, 191, 36, 0.2)',
          marginBottom: 16
        }}>
          <p style={{ fontSize: 14, color: '#fbbf24', margin: 0, fontWeight: 500 }}>
            ⚠️ Virtual audio device required
          </p>
          <p style={{ fontSize: 13, color: '#a1a1aa', margin: '8px 0 0 0', lineHeight: 1.5 }}>
            macOS {macVersion?.version || '12 or earlier'} requires BlackHole to capture system audio.
          </p>
        </div>
      )}
      
      {supportsSCK ? (
        <>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#71717a', marginBottom: 8 }}>
            Fallback Device (Optional)
          </label>
          <select
            value={settings.system_audio_device_id || ''}
            onChange={(e) => handleChange('system_audio_device_id', e.target.value || undefined)}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              background: '#18181b',
              color: '#71717a',
              fontSize: 14,
              border: '1px solid #27272a',
              borderRadius: 8,
              outline: 'none'
            }}
          >
            <option value="">Not needed — using native capture</option>
            {inputDevices.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </>
      ) : (
        <>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 8 }}>
            System Audio Device
          </label>
          <select
            value={settings.system_audio_device_id || ''}
            onChange={(e) => handleChange('system_audio_device_id', e.target.value || undefined)}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              background: '#18181b',
              color: 'white',
              fontSize: 14,
              border: '1px solid #3f3f46',
              borderRadius: 8,
              outline: 'none'
            }}
          >
            <option value="">Select BlackHole device...</option>
            {inputDevices.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: '#71717a', marginTop: 8, lineHeight: 1.5 }}>
            Select "BlackHole 2ch" after installing it.
            <br />
            <a 
              href="https://existential.audio/blackhole/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#5b7fff', textDecoration: 'none' }}
            >
              Download BlackHole →
            </a>
          </p>
        </>
      )}
    </>
  )
}

export function Settings({ onClose, initialTab }: Props) {
  const { user, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>((initialTab as Tab) || 'account')
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [devices, setDevices] = useState<{ id: string; name: string }[]>([])
  const [platform, setPlatform] = useState<string>('darwin')
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [desktopSources, setDesktopSources] = useState<DesktopSource[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('')
  const [updateStatus, setUpdateStatus] = useState<{ available: boolean; version?: string; downloading?: boolean; downloaded?: boolean; checking?: boolean; lastChecked?: number; error?: string; releaseNotes?: string }>({ available: false })
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await signOut()
  }

  useEffect(() => {
    Promise.all([
      window.api.settings.get(),
      loadAudioDevices(),
      window.api.system.getPlatform(),
      window.api.system.getAppVersion(),
      window.api.system.getUpdateStatus()
    ]).then(
      ([loadedSettings, loadedDevices, loadedPlatform, version, update]) => {
        setSettings(loadedSettings)
        setDevices(loadedDevices)
        setPlatform(loadedPlatform)
        setAppVersion(version)
        setUpdateStatus(update)
        if (loadedSettings.desktop_source_id) {
          setSelectedSourceId(loadedSettings.desktop_source_id)
        }
      }
    )

    const unsubscribe = window.api.system.onUpdateAvailable((info) => {
      setUpdateStatus(prev => ({ ...prev, available: true, version: info.version, downloading: true, downloaded: false, checking: false }))
    })

    const pollInterval = setInterval(async () => {
      const status = await window.api.system.getUpdateStatus()
      setUpdateStatus(status)
    }, 1000)

    return () => {
      unsubscribe()
      clearInterval(pollInterval)
    }
  }, [])

  async function loadAudioDevices(): Promise<{ id: string; name: string }[]> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      for (const track of stream.getTracks()) track.stop()
    } catch {
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter(d => d.kind === 'audioinput')
      .map(d => ({ id: d.deviceId, name: d.label || 'Audio input' }))
  }

  async function openSourcePicker() {
    const sources = await window.api.system.getDesktopSources()
    setDesktopSources(sources)
    setShowSourcePicker(true)
  }

  function selectSource(source: DesktopSource) {
    setSelectedSourceId(source.id)
    handleChange('desktop_source_id', source.id)
    setShowSourcePicker(false)
  }

  const handleChange = useCallback(
    <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
      setSettings((prev) => {
        if (!prev) return prev
        const updated = { ...prev, [key]: value }
        window.api.settings.set(updated)
        return updated
      })
    },
    []
  )

  if (!settings) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#71717a',
        fontSize: 14,
        background: '#161616'
      }}>
        Loading...
      </div>
    )
  }

  const inputDevices = devices

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#161616',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient blue glows */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-15%',
        width: 700,
        height: 700,
        background: 'radial-gradient(circle, rgba(91, 127, 255, 0.25) 0%, rgba(91, 127, 255, 0.1) 30%, transparent 70%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-10%',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(59, 91, 219, 0.2) 0%, rgba(59, 91, 219, 0.08) 30%, transparent 70%)',
        filter: 'blur(90px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <header style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        paddingLeft: platform === 'darwin' ? 80 : 16,
        borderBottom: '1px solid rgba(39, 39, 42, 0.5)',
        WebkitAppRegion: 'drag',
        position: 'relative',
        zIndex: 1,
      } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a1a1aa',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 6
            }}
          >
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>Settings</span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <nav style={{
          padding: '24px 16px',
          borderRight: '1px solid rgba(39, 39, 42, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                height: 40,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: activeTab === tab.id ? '#27272a' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#a1a1aa',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            style={{ maxWidth: 560 }}
          >
            {activeTab === 'audio' && (
              <div style={{
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: 12,
                padding: 24
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 24px 0' }}>Audio</h2>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 8 }}>
                    Microphone
                  </label>
                  <select
                    value={settings.mic_device_id || ''}
                    onChange={(e) => handleChange('mic_device_id', e.target.value || undefined)}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      background: '#18181b',
                      color: 'white',
                      fontSize: 14,
                      border: '1px solid #3f3f46',
                      borderRadius: 8,
                      outline: 'none'
                    }}
                  >
                    <option value="">System Default</option>
                    {inputDevices.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 8 }}>
                    System Audio {platform === 'win32' ? '(Screen/Window)' : 'Device'}
                  </label>
                  
                  {platform === 'win32' ? (
                    <div>
                      <button
                        onClick={openSourcePicker}
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 12px',
                          background: '#18181b',
                          color: 'white',
                          fontSize: 14,
                          border: '1px solid #3f3f46',
                          borderRadius: 8,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <Monitor style={{ width: 16, height: 16, color: '#71717a' }} />
                        {selectedSourceId 
                          ? desktopSources.find(s => s.id === selectedSourceId)?.name || 'Selected source'
                          : 'Select screen or window...'
                        }
                      </button>
                      <p style={{ fontSize: 12, color: '#71717a', marginTop: 8 }}>
                        Select a screen or window to capture its audio.
                      </p>
                    </div>
                  ) : (
                    <MacOSAudioSection 
                      settings={settings} 
                      inputDevices={inputDevices} 
                      handleChange={handleChange} 
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 12,
                  padding: 24
                }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 24px 0' }}>API</h2>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 8 }}>
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={settings.openai_api_key}
                      onChange={(e) => handleChange('openai_api_key', e.target.value)}
                      placeholder="sk-..."
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 12px',
                        background: '#18181b',
                        color: 'white',
                        fontSize: 14,
                        border: '1px solid #3f3f46',
                        borderRadius: 8,
                        outline: 'none'
                      }}
                    />
                    <p style={{ fontSize: 12, color: '#71717a', marginTop: 8 }}>
                      Stored locally on this machine.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 12,
                  padding: 24
                }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 24px 0' }}>Transcription</h2>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 8 }}>
                      Realtime Transcription Model
                    </label>
                    <select
                      value={settings.realtime_model}
                      onChange={(e) => handleChange('realtime_model', e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 12px',
                        background: '#18181b',
                        color: 'white',
                        fontSize: 14,
                        border: '1px solid #3f3f46',
                        borderRadius: 8,
                        outline: 'none'
                      }}
                    >
                      <option value="gpt-4o-realtime-preview">gpt-4o-realtime-preview (Recommended)</option>
                      <option value="gpt-4o-realtime-preview-2024-12-17">gpt-4o-realtime-preview-2024-12-17</option>
                      <option value="gpt-4o-mini-realtime-preview">gpt-4o-mini-realtime-preview (Cost-efficient)</option>
                      <option value="gpt-4o-mini-realtime-preview-2024-12-17">gpt-4o-mini-realtime-preview-2024-12-17</option>
                    </select>
                    <p style={{ fontSize: 12, color: '#71717a', marginTop: 8 }}>
                      Used for live audio transcription via WebSocket.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 12,
                  padding: 24
                }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 24px 0' }}>Analysis</h2>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 8 }}>
                      Summary & Action Items Model
                    </label>
                    <select
                      value={settings.feedback_model || 'gpt-4o'}
                      onChange={(e) => handleChange('feedback_model', e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 12px',
                        background: '#18181b',
                        color: 'white',
                        fontSize: 14,
                        border: '1px solid #3f3f46',
                        borderRadius: 8,
                        outline: 'none'
                      }}
                    >
                      <option value="gpt-4o">gpt-4o (Best quality)</option>
                      <option value="gpt-4o-mini">gpt-4o-mini (Fast)</option>
                      <option value="gpt-4-turbo">gpt-4-turbo</option>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                    </select>
                    <p style={{ fontSize: 12, color: '#71717a', marginTop: 8 }}>
                      Used for post-meeting summary, action items, and chat.
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 8 }}>
                      Language
                    </label>
                    <select
                      value={settings.language || 'en'}
                      onChange={(e) => handleChange('language', e.target.value as SettingsType['language'])}
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 12px',
                        background: '#18181b',
                        color: 'white',
                        fontSize: 14,
                        border: '1px solid #3f3f46',
                        borderRadius: 8,
                        outline: 'none'
                      }}
                    >
                      <option value="en">English</option>
                      <option value="nl">Dutch</option>
                      <option value="fr">French</option>
                    </select>
                    <p style={{ fontSize: 12, color: '#71717a', marginTop: 8 }}>
                      Output language for summaries, action items, and chat responses.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* App Version & Updates */}
                <div style={{
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 12,
                  padding: 24
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: 0 }}>Meeting Notes</h2>
                      <p style={{ fontSize: 13, color: '#71717a', margin: '4px 0 0 0' }}>Version {appVersion}</p>
                    </div>
                    <button
                      onClick={async () => {
                        setIsCheckingUpdate(true)
                        try {
                          await window.api.system.checkForUpdates()
                          let attempts = 0
                          const maxAttempts = 10
                          while (attempts < maxAttempts) {
                            await new Promise(r => setTimeout(r, 500))
                            const status = await window.api.system.getUpdateStatus()
                            setUpdateStatus(status)
                            if (!status.checking) break
                            attempts++
                          }
                        } finally {
                          setIsCheckingUpdate(false)
                        }
                      }}
                      disabled={isCheckingUpdate || updateStatus.downloading}
                      style={{
                        padding: '8px 14px',
                        background: 'transparent',
                        color: '#a1a1aa',
                        fontSize: 13,
                        borderRadius: 8,
                        border: '1px solid #3f3f46',
                        cursor: isCheckingUpdate || updateStatus.downloading ? 'not-allowed' : 'pointer',
                        opacity: isCheckingUpdate || updateStatus.downloading ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {isCheckingUpdate && <Loader2 size={14} className="animate-spin" />}
                      {isCheckingUpdate ? 'Checking...' : 'Check for updates'}
                    </button>
                  </div>

                  {/* Update available banner */}
                  {updateStatus.available && (
                    <div style={{
                      padding: 16,
                      background: updateStatus.downloaded
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(91, 127, 255, 0.08)',
                      borderRadius: 10,
                      border: `1px solid ${updateStatus.downloaded
                        ? 'rgba(34, 197, 94, 0.2)'
                        : 'rgba(91, 127, 255, 0.2)'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: updateStatus.releaseNotes ? 12 : 0 }}>
                        <div>
                          <p style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: updateStatus.downloaded ? '#4ade80' : '#5b7fff',
                            margin: 0
                          }}>
                            {updateStatus.downloaded
                              ? `v${updateStatus.version} ready to install`
                              : updateStatus.downloading
                                ? `Downloading v${updateStatus.version}...`
                                : `v${updateStatus.version} available`}
                          </p>
                          {!updateStatus.downloaded && updateStatus.downloading && (
                            <p style={{ fontSize: 12, color: '#71717a', margin: '4px 0 0 0' }}>
                              The update will install when you restart the app
                            </p>
                          )}
                        </div>
                        {updateStatus.downloaded && (
                          <button
                            onClick={() => window.api.system.installUpdate()}
                            style={{
                              padding: '8px 16px',
                              background: '#22c55e',
                              color: 'white',
                              fontSize: 13,
                              fontWeight: 600,
                              borderRadius: 8,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Install & Restart
                          </button>
                        )}
                      </div>

                      {updateStatus.releaseNotes && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#71717a', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            What's new
                          </p>
                          <div style={{ fontSize: 13, color: '#d4d4d8', lineHeight: 1.6 }}>
                            {updateStatus.releaseNotes.split('\n').filter(line => line.trim().startsWith('-')).slice(0, 5).map((line, i) => (
                              <p key={i} style={{ margin: '2px 0' }}>{line}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error state */}
                  {updateStatus.error && (
                    <div style={{
                      padding: 12,
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: 8,
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}>
                      <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>
                        {updateStatus.error}
                      </p>
                    </div>
                  )}

                  {/* Up to date state */}
                  {!updateStatus.available && !updateStatus.error && (
                    <p style={{ fontSize: 13, color: '#52525b', margin: 0 }}>
                      {updateStatus.lastChecked
                        ? `✓ You're on the latest version`
                        : 'Check for updates to make sure you have the latest features'}
                    </p>
                  )}
                </div>

                {/* Profile Section */}
                <div style={{
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 12,
                  padding: 24
                }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: '#71717a', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profile</h2>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #5b7fff 0%, #3b5bdb 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 600,
                      color: 'white',
                      flexShrink: 0,
                    }}>
                      {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile?.full_name || 'User'}
                      </p>
                      <p style={{ fontSize: 13, color: '#71717a', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.email}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 11, color: '#52525b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Member since</p>
                      <p style={{ fontSize: 13, color: '#a1a1aa', margin: '2px 0 0 0' }}>
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sign Out */}
                <div style={{
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'white', margin: 0 }}>Sign out</p>
                    <p style={{ fontSize: 12, color: '#52525b', margin: '2px 0 0 0' }}>
                      Sign out of your account on this device
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: '#f87171',
                      fontSize: 13,
                      fontWeight: 500,
                      borderRadius: 8,
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      cursor: loggingOut ? 'not-allowed' : 'pointer',
                      opacity: loggingOut ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <LogOut style={{ width: 14, height: 14 }} />
                    {loggingOut ? 'Signing out...' : 'Sign Out'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'context' && (
              <div style={{
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: 12,
                padding: 24
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 8px 0' }}>AI Context</h2>
                <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                  Provide context about yourself and your work. This helps the AI generate more relevant summaries and action items.
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 8 }}>
                    Your Context
                  </label>
                  <textarea
                    value={settings.ai_context || ''}
                    onChange={(e) => handleChange('ai_context', e.target.value)}
                    placeholder="Example: I am John, a senior developer at Acme Corp. I work on the mobile team and lead the iOS development. My manager is Sarah. We use Jira for task tracking..."
                    style={{
                      width: '100%',
                      minHeight: 180,
                      padding: 12,
                      background: '#18181b',
                      color: 'white',
                      fontSize: 14,
                      lineHeight: 1.6,
                      border: '1px solid #3f3f46',
                      borderRadius: 8,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                  <p style={{ fontSize: 12, color: '#52525b', marginTop: 12, lineHeight: 1.5 }}>
                    This context will be included when generating meeting summaries and extracting action items,
                    helping the AI understand who you are, your role, and how to assign tasks appropriately.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {showSourcePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowSourcePicker(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#18181b',
                borderRadius: 16,
                border: '1px solid #27272a',
                padding: 24,
                maxWidth: 700,
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: 0 }}>
                  Select Audio Source
                </h2>
                <button
                  onClick={() => setShowSourcePicker(false)}
                  style={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: '#71717a'
                  }}
                >
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>
              
              <p style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 16 }}>
                Select a screen or window to capture its audio.
              </p>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                gap: 12,
                overflowY: 'auto',
                flex: 1
              }}>
                {desktopSources.map(source => (
                  <button
                    key={source.id}
                    onClick={() => selectSource(source)}
                    style={{
                      background: selectedSourceId === source.id ? '#3f3f46' : '#18181b',
                      border: selectedSourceId === source.id ? '2px solid #5b7fff' : '1px solid #27272a',
                      borderRadius: 8,
                      padding: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <img 
                      src={source.thumbnail} 
                      alt={source.name}
                      style={{
                        width: '100%',
                        height: 90,
                        objectFit: 'cover',
                        borderRadius: 4,
                        background: '#000'
                      }}
                    />
                    <span style={{ 
                      fontSize: 11, 
                      color: 'white', 
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%'
                    }}>
                      {source.name}
                    </span>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => {
                    setSelectedSourceId(null)
                    handleChange('desktop_source_id', undefined)
                    setShowSourcePicker(false)
                  }}
                  style={{
                    height: 36,
                    padding: '0 16px',
                    background: 'transparent',
                    color: '#a1a1aa',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 8,
                    border: '1px solid #3f3f46',
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => setShowSourcePicker(false)}
                  style={{
                    height: 36,
                    padding: '0 16px',
                    background: '#5b7fff',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
