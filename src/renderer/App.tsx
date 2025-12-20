import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Session } from '@shared/types'
import { Sessions } from './pages/Sessions'
import { InCall } from './pages/InCall'
import { Settings } from './pages/Settings'
import { MeetingDetail } from './pages/MeetingDetail'
import { Analytics } from './pages/Analytics'

type AppView = 'sessions' | 'in-call' | 'settings' | 'meeting-detail' | 'analytics'

export function App() {
  const [view, setView] = useState<AppView>('sessions')
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = window.api?.call?.onFinalizeStatus?.((status) => {
      if (status.stage === 'generating_summary') {
        setStatusMessage('Processing meeting...')
      } else if (status.stage === 'complete') {
        setStatusMessage(null)
      } else if (status.stage === 'error') {
        setStatusMessage(`Error: ${status.error}`)
        setTimeout(() => setStatusMessage(null), 5000)
      }
    })
    return () => unsubscribe?.()
  }, [])

  const handleStartMeeting = useCallback(async () => {
    try {
      const session = await window.api.call.start()
      setCurrentSession(session)
      setView('in-call')
    } catch (err) {
      console.error('Failed to start meeting:', err)
    }
  }, [])

  const handleEndMeeting = useCallback(async () => {
    if (currentSession) {
      await window.api.call.end(currentSession.id)
    }
    setCurrentSession(null)
    setView('sessions')
  }, [currentSession])

  const handleOpenSettings = useCallback(() => setView('settings'), [])
  const handleCloseSettings = useCallback(() => setView('sessions'), [])
  const handleOpenMeetingDetail = useCallback((sessionId: string) => {
    setDetailSessionId(sessionId)
    setView('meeting-detail')
  }, [])
  const handleCloseMeetingDetail = useCallback(() => {
    setDetailSessionId(null)
    setView('sessions')
  }, [])
  const handleOpenAnalytics = useCallback(() => setView('analytics'), [])
  const handleCloseAnalytics = useCallback(() => setView('sessions'), [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--background-secondary)]">
      <AnimatePresence mode="wait">
        {view === 'sessions' && (
          <Sessions
            key="sessions"
            onStartCall={handleStartMeeting}
            onOpenSettings={handleOpenSettings}
            onOpenCallDetail={handleOpenMeetingDetail}
            onOpenAnalytics={handleOpenAnalytics}
          />
        )}
        {view === 'in-call' && currentSession && (
          <InCall key="incall" session={currentSession} onEndCall={handleEndMeeting} />
        )}
        {view === 'settings' && <Settings key="settings" onClose={handleCloseSettings} />}
        {view === 'meeting-detail' && detailSessionId && (
          <MeetingDetail key="detail" sessionId={detailSessionId} onClose={handleCloseMeetingDetail} />
        )}
        {view === 'analytics' && <Analytics key="analytics" onClose={handleCloseAnalytics} />}
      </AnimatePresence>

      <AnimatePresence>
        {statusMessage && (
          <motion.div 
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: 44,
              background: 'linear-gradient(135deg, #5b7fff 0%, #3b5bdb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontSize: 13,
              fontWeight: 500,
              color: 'white',
              boxShadow: '0 -4px 20px rgba(91, 127, 255, 0.3)'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: 16, height: 16 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
              </svg>
            </motion.div>
            {statusMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
