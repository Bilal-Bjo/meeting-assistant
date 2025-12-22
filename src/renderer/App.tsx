import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { meetingsDb, onboardingDb, type DbMeeting, type MeetingSummary, type MeetingActionItems } from './lib/supabase'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { Onboarding } from './pages/Onboarding'
import { Sessions } from './pages/Sessions'
import { InCall } from './pages/InCall'
import { Settings } from './pages/Settings'
import { MeetingDetail } from './pages/MeetingDetail'
import { Analytics } from './pages/Analytics'
import { Loader2 } from 'lucide-react'

type AppView = 'sessions' | 'in-call' | 'settings' | 'meeting-detail' | 'analytics'

function AppContent() {
  const { user, loading } = useAuth()
  const [view, setView] = useState<AppView>('sessions')
  const [currentMeeting, setCurrentMeeting] = useState<DbMeeting | null>(null)
  const [detailMeetingId, setDetailMeetingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)
  const pendingPostCallRef = useRef<string | null>(null)

  // Check onboarding status when user logs in
  useEffect(() => {
    if (!user) {
      setOnboardingCompleted(null)
      return
    }

    const checkOnboarding = async () => {
      try {
        const completed = await onboardingDb.isCompleted()
        setOnboardingCompleted(completed)
      } catch (err) {
        console.error('Failed to check onboarding:', err)
        // Default to completed to avoid blocking user
        setOnboardingCompleted(true)
      }
    }

    checkOnboarding()
  }, [user])

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true)
  }, [])

  useEffect(() => {
    const unsubscribeStatus = window.api?.call?.onFinalizeStatus?.((status) => {
      if (status.stage === 'generating_summary') {
        setStatusMessage('Processing meeting...')
      } else if (status.stage === 'complete') {
        setStatusMessage(null)
      } else if (status.stage === 'error') {
        setStatusMessage(`Error: ${status.error}`)
        setTimeout(() => setStatusMessage(null), 5000)
      }
    })

    // Listen for post-call results and save to Supabase
    const unsubscribeResult = window.api?.call?.onPostCallResult?.(async (data) => {
      if (!data.error && data.meetingId) {
        try {
          const updates: Partial<DbMeeting> = {}
          if (data.summary) {
            updates.summary = data.summary as MeetingSummary
            // Update title if generated
            const summary = data.summary as MeetingSummary
            if (summary.title) {
              updates.title = summary.title
            }
          }
          if (data.actionItems) {
            updates.action_items = data.actionItems as MeetingActionItems
          }
          if (Object.keys(updates).length > 0) {
            await meetingsDb.update(data.meetingId, updates)
          }
        } catch (err) {
          console.error('Failed to save post-call results:', err)
        }
      }
      pendingPostCallRef.current = null
    })

    return () => {
      unsubscribeStatus?.()
      unsubscribeResult?.()
    }
  }, [])

  const handleStartMeeting = useCallback(async () => {
    try {
      // Create meeting in Supabase
      const title = `Meeting ${new Date().toLocaleString()}`
      const meeting = await meetingsDb.create(title)
      if (!meeting) {
        console.error('Failed to create meeting')
        return
      }
      setCurrentMeeting(meeting)
      setView('in-call')

      // Start realtime connection
      await window.api.realtime.connect(meeting.id)
    } catch (err) {
      console.error('Failed to start meeting:', err)
    }
  }, [])

  const handleEndMeeting = useCallback(async () => {
    if (currentMeeting) {
      await window.api.realtime.disconnect()
      // The post-call processing will be triggered from InCall
    }
    setCurrentMeeting(null)
    setView('sessions')
  }, [currentMeeting])

  const handleOpenSettings = useCallback(() => setView('settings'), [])
  const handleCloseSettings = useCallback(() => setView('sessions'), [])
  const handleOpenMeetingDetail = useCallback((meetingId: string) => {
    setDetailMeetingId(meetingId)
    setView('meeting-detail')
  }, [])
  const handleCloseMeetingDetail = useCallback(() => {
    setDetailMeetingId(null)
    setView('sessions')
  }, [])
  const handleOpenAnalytics = useCallback(() => setView('analytics'), [])
  const handleCloseAnalytics = useCallback(() => setView('sessions'), [])

  if (loading) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: '#161616' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
        >
          <Loader2 size={32} className="animate-spin" style={{ color: '#5b7fff' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading...</p>
        </motion.div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  // Show loading while checking onboarding status
  if (onboardingCompleted === null) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: '#161616' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
        >
          <Loader2 size={32} className="animate-spin" style={{ color: '#5b7fff' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading...</p>
        </motion.div>
      </div>
    )
  }

  // Show onboarding for first-time users
  if (!onboardingCompleted) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

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
        {view === 'in-call' && currentMeeting && (
          <InCall key="incall" meeting={currentMeeting} onEndCall={handleEndMeeting} />
        )}
        {view === 'settings' && <Settings key="settings" onClose={handleCloseSettings} />}
        {view === 'meeting-detail' && detailMeetingId && (
          <MeetingDetail key="detail" meetingId={detailMeetingId} onClose={handleCloseMeetingDetail} />
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

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
