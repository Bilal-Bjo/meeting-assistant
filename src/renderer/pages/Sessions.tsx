import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Session, Settings as SettingsType } from '@shared/types'
import { Settings, Trash2, Video, ChevronRight, BarChart3, Loader2, FileText, X } from 'lucide-react'

interface Props {
  onStartCall: () => void
  onOpenSettings: () => void
  onOpenCallDetail: (sessionId: string) => void
  onOpenAnalytics: () => void
}

export function Sessions({ onStartCall, onOpenSettings, onOpenCallDetail, onOpenAnalytics }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [irlMode, setIrlMode] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.db.getSessions()
      setSessions(data)
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    window.api.settings.get().then((s: SettingsType) => {
      setIrlMode(Boolean(s.irl_mode))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.call.onFinalizeStatus((status) => {
      if (status.stage === 'generating_summary') {
        setProcessingIds(prev => new Set(prev).add(status.sessionId))
      } else if (status.stage === 'complete' || status.stage === 'error') {
        setProcessingIds(prev => {
          const next = new Set(prev)
          next.delete(status.sessionId)
          return next
        })
        loadSessions()
      }
    })
    return () => unsubscribe()
  }, [loadSessions])

  const handleToggleIrl = useCallback(async () => {
    const next = !irlMode
    setIrlMode(next)
    try {
      await window.api.settings.set({ irl_mode: next })
    } catch {
    }
  }, [irlMode])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await window.api.db.deleteSession(id)
    loadSessions()
  }

  const handleImport = async () => {
    if (!importText.trim() || importing) return
    setImporting(true)
    try {
      await window.api.call.importTranscript(importText.trim())
      setShowImportModal(false)
      setImportText('')
      loadSessions()
    } catch (err) {
      console.error('Failed to import transcript:', err)
    }
    setImporting(false)
  }

  const grouped = groupByDate(sessions)
  const todayCount = sessions.filter(s => 
    new Date(s.created_at).toDateString() === new Date().toDateString()
  ).length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#09090b' }}
    >
      <header style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 16px',
        paddingLeft: 80,
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        gap: 4,
        WebkitAppRegion: 'drag'
      } as React.CSSProperties}>
        <button
          onClick={onOpenAnalytics}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#525252',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 8,
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties}
          title="Analytics"
        >
          <BarChart3 style={{ width: 18, height: 18 }} />
        </button>
        <button
          onClick={onOpenSettings}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#525252',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 8,
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties}
          title="Settings"
        >
          <Settings style={{ width: 18, height: 18 }} />
        </button>
      </header>

      <div style={{ 
        padding: '40px 32px 32px',
        background: 'linear-gradient(to bottom, rgba(91, 127, 255, 0.03), transparent)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>Meetings</h1>
            {!loading && sessions.length > 0 && (
              <p style={{ fontSize: 13, color: '#525252', margin: '6px 0 0 0' }}>
                {sessions.length} meeting{sessions.length !== 1 ? 's' : ''} · {todayCount} today
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleToggleIrl}
              style={{
                height: 36,
                padding: '0 12px',
                background: irlMode ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                color: irlMode ? '#22c55e' : '#a3a3a3',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              title="In-person meeting mode"
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: irlMode ? '#22c55e' : '#404040'
              }} />
              IRL
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              style={{
                height: 36,
                padding: '0 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#a3a3a3',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <FileText size={14} />
              Import
            </button>
            <button
              onClick={onStartCall}
              style={{
                height: 36,
                padding: '0 16px',
                background: '#5b7fff',
                color: 'white',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              New Meeting
            </button>
          </div>
        </div>
      </div>

      <main style={{ flex: 1, overflowY: 'auto', padding: '0 32px 64px' }}>
        <div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
              <div style={{ color: '#404040', fontSize: 13 }}>Loading...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center' }}>
              <div style={{
                width: 52,
                height: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(91, 127, 255, 0.08)',
                borderRadius: 12,
                marginBottom: 16
              }}>
                <Video style={{ width: 22, height: 22, color: '#5b7fff' }} />
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'white', margin: '0 0 4px 0' }}>No meetings yet</h2>
              <p style={{ fontSize: 13, color: '#404040', margin: '0 0 20px 0', maxWidth: 240, lineHeight: 1.5 }}>
                Start recording your meetings to get transcripts, summaries, and action items.
              </p>
              <button
                onClick={onStartCall}
                style={{
                  height: 36,
                  padding: '0 18px',
                  background: '#5b7fff',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Start Meeting
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Object.entries(grouped).map(([label, items], groupIndex) => (
                <section key={label} style={{ marginTop: groupIndex === 0 ? 0 : 8 }}>
                  <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    background: '#09090b',
                    padding: '20px 0 10px',
                    marginBottom: 4
                  }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#404040',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em'
                    }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    overflow: 'hidden'
                  }}>
                    {items.map((session, idx) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onClick={() => onOpenCallDetail(session.id)}
                        onDelete={(e) => handleDelete(session.id, e)}
                        isLast={idx === items.length - 1}
                        isProcessing={processingIds.has(session.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: 24
            }}
            onClick={() => !importing && setShowImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 560,
                background: '#18181b',
                borderRadius: 16,
                border: '1px solid #27272a',
                overflow: 'hidden'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #27272a'
              }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'white', margin: 0 }}>
                  Import Transcript
                </h2>
                <button
                  onClick={() => !importing && setShowImportModal(false)}
                  style={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    color: '#71717a',
                    borderRadius: 6
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: 20 }}>
                <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 12px 0' }}>
                  Paste your meeting transcript below. The AI will generate a summary and extract action items.
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste your transcript here..."
                  disabled={importing}
                  style={{
                    width: '100%',
                    height: 240,
                    padding: 12,
                    background: '#09090b',
                    border: '1px solid #27272a',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 13,
                    lineHeight: 1.6,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '12px 20px',
                borderTop: '1px solid #27272a',
                background: 'rgba(0, 0, 0, 0.2)'
              }}>
                <button
                  onClick={() => !importing && setShowImportModal(false)}
                  disabled={importing}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: '#a3a3a3',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: '1px solid #27272a',
                    cursor: importing ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importText.trim() || importing}
                  style={{
                    padding: '8px 16px',
                    background: importText.trim() && !importing ? '#5b7fff' : '#27272a',
                    color: importText.trim() && !importing ? 'white' : '#525252',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: 'none',
                    cursor: importText.trim() && !importing ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {importing && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 size={14} />
                    </motion.div>
                  )}
                  {importing ? 'Processing...' : 'Analyze Transcript'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface SessionCardProps {
  session: Session
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  isLast: boolean
  isProcessing?: boolean
}

function SessionCard({ session, onClick, onDelete, isLast, isProcessing }: SessionCardProps) {
  const [hovered, setHovered] = useState(false)
  const duration = session.duration_sec
  const hasRecording = duration > 0
  
  const displayTitle = getDisplayTitle(session)
  const relativeTime = getRelativeTime(session.created_at)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        background: hovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
        transition: 'background 0.1s ease'
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block',
          marginBottom: 4
        }}>
          {displayTitle}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#404040' }}>
          <span>{relativeTime}</span>
          {hasRecording && (
            <>
              <span style={{ color: '#262626' }}>·</span>
              <span>{formatDuration(duration)}</span>
            </>
          )}
          {!hasRecording && (
            <span style={{ color: '#333' }}>· No recording</span>
          )}
        </div>
      </div>

      {isProcessing && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'rgba(91, 127, 255, 0.15)',
          borderRadius: 12,
          marginRight: 8
        }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 style={{ width: 12, height: 12, color: '#5b7fff' }} />
          </motion.div>
          <span style={{ fontSize: 11, color: '#5b7fff', fontWeight: 500 }}>
            Analyzing...
          </span>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.1s ease'
      }}>
        <button
          onClick={onDelete}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            color: '#404040'
          }}
          title="Delete"
        >
          <Trash2 style={{ width: 14, height: 14 }} />
        </button>
      </div>

      <ChevronRight 
        style={{ 
          width: 14, 
          height: 14, 
          color: hovered ? '#525252' : '#262626',
          transition: 'color 0.1s ease',
          flexShrink: 0
        }} 
      />
    </div>
  )
}

function getDisplayTitle(session: Session): string {
  const hasCustomTitle = session.title && !session.title.match(/^Meeting \d{1,2}\/\d{1,2}\/\d{4}/)
  
  if (hasCustomTitle) {
    return session.title!
  }
  
  const date = new Date(session.created_at)
  const hour = date.getHours()
  
  let timeOfDay: string
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'Morning'
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'Afternoon'
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'Evening'
  } else {
    timeOfDay = 'Night'
  }
  
  return `${timeOfDay} Meeting`
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase()
}

function groupByDate(sessions: Session[]): Record<string, Session[]> {
  const groups: Record<string, Session[]> = {}
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  for (const session of sessions) {
    const date = new Date(session.created_at).toDateString()
    let label: string
    if (date === today) {
      label = 'Today'
    } else if (date === yesterday) {
      label = 'Yesterday'
    } else {
      label = new Date(session.created_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })
    }
    if (!groups[label]) groups[label] = []
    groups[label].push(session)
  }

  return groups
}

function formatDuration(sec: number): string {
  if (!sec) return '0:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`
  return `0:${s.toString().padStart(2, '0')}`
}
