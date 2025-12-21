import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Circle, Clock, AlertCircle, MessageSquare, Send, User, Bot } from 'lucide-react'
import type { Session, TranscriptSegment, MeetingChat, ActionItem } from '@shared/types'

interface Props {
  sessionId: string
  onClose: () => void
}

type Tab = 'summary' | 'transcript' | 'actions' | 'chat'

export function MeetingDetail({ sessionId, onClose }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [chats, setChats] = useState<MeetingChat[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const [loading, setLoading] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [loadedSession, loadedSegments, loadedChats] = await Promise.all([
      window.api.db.getSession(sessionId),
      window.api.db.getTranscriptSegments(sessionId),
      window.api.db.getMeetingChats(sessionId),
    ])
    setSession(loadedSession)
    setSegments(loadedSegments)
    setChats(loadedChats)
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const unsubDelta = window.api.meetingChat.onDelta((data) => {
      if (data.sessionId === sessionId) {
        setStreamingText(prev => prev + data.text)
      }
    })

    const unsubResponse = window.api.meetingChat.onResponse(async (data) => {
      if (data.sessionId === sessionId) {
        setChatLoading(false)
        setStreamingText('')
        if (!data.error) {
          const loadedChats = await window.api.db.getMeetingChats(sessionId)
          setChats(loadedChats)
        }
      }
    })

    return () => {
      unsubDelta()
      unsubResponse()
    }
  }, [sessionId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chats, streamingText])

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const message = chatInput.trim()
    setChatInput('')
    setChatLoading(true)
    setStreamingText('')
    await window.api.meetingChat.send(sessionId, message)
  }

  const handleToggleActionItem = async (index: number) => {
    if (!session?.action_items) return
    const updatedItems = [...(session.action_items.action_items || [])]
    updatedItems[index] = { ...updatedItems[index], completed: !updatedItems[index].completed }
    const updatedActionItems = { ...session.action_items, action_items: updatedItems }
    await window.api.db.setActionItems(sessionId, updatedActionItems)
    setSession({ ...session, action_items: updatedActionItems })
  }

  if (loading || !session) {
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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    if (hrs > 0) return `${hrs}h ${mins}m`
    return `${mins} min`
  }

  const actionItems = session.action_items?.action_items || []
  const followUps = session.action_items?.follow_ups || []
  const openQuestions = session.action_items?.open_questions || []
  const hasAnyActions = actionItems.length > 0 || followUps.length > 0 || openQuestions.length > 0

  const availableTabs: Tab[] = hasAnyActions 
    ? ['summary', 'transcript', 'actions', 'chat']
    : ['summary', 'transcript', 'chat']

  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#eab308'
      case 'low': return '#22c55e'
      default: return '#71717a'
    }
  }

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
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(91, 127, 255, 0.12) 0%, rgba(91, 127, 255, 0.04) 30%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-10%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(59, 91, 219, 0.1) 0%, rgba(59, 91, 219, 0.03) 30%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <header style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        paddingLeft: 80,
        borderBottom: '1px solid rgba(39, 39, 42, 0.5)',
        WebkitAppRegion: 'drag',
        position: 'relative',
        zIndex: 1,
      } as React.CSSProperties}>
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
            borderRadius: 6,
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties}
        >
          <ArrowLeft style={{ width: 20, height: 20 }} />
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ color: '#71717a', fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{formatDate(session.created_at)}</span>
            {session.duration_sec > 0 && (
              <>
                <span style={{ color: '#3f3f46' }}>•</span>
                <span>{formatDuration(session.duration_sec)}</span>
              </>
            )}
          </div>

          <h1 style={{
            fontSize: 30,
            fontWeight: 600,
            color: 'white',
            margin: '0 0 24px 0',
            lineHeight: 1.2
          }}>
            {session.title}
          </h1>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(39, 39, 42, 0.6)',
            borderRadius: 8,
            padding: 2,
            marginBottom: 32,
            width: 'fit-content'
          }}>
            {availableTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  background: activeTab === tab ? '#3f3f46' : 'transparent',
                  color: activeTab === tab ? 'white' : '#a1a1aa',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {tab === 'chat' && <MessageSquare size={14} />}
                {tab === 'actions' ? 'Action Items' : tab}
              </button>
            ))}
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {session.summary?.summary && (
                  <section>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', margin: '0 0 16px 0' }}>Overview</h2>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: '#d4d4d8', margin: 0 }}>
                      {session.summary.summary}
                    </p>
                  </section>
                )}

                {session.summary?.decisions?.length ? (
                  <section>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', margin: '0 0 16px 0' }}>Decisions Made</h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {session.summary.decisions.map((decision, i) => (
                        <li key={i} style={{ display: 'flex', gap: 12, fontSize: 15, color: '#d4d4d8', lineHeight: 1.6 }}>
                          <CheckCircle2 size={18} style={{ color: '#22c55e', marginTop: 2, flexShrink: 0 }} />
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {session.summary?.key_points?.length ? (
                  <section>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', margin: '0 0 16px 0' }}>Key Discussion Points</h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {session.summary.key_points.map((point, i) => (
                        <li key={i} style={{ display: 'flex', gap: 12, fontSize: 15, color: '#d4d4d8', lineHeight: 1.6 }}>
                          <span style={{ color: '#5b7fff', marginTop: 6 }}>•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {session.summary?.participants_mentioned?.length ? (
                  <section>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', margin: '0 0 16px 0' }}>Participants</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {session.summary.participants_mentioned.map((name, i) => (
                        <span key={i} style={{
                          padding: '6px 12px',
                          background: '#27272a',
                          borderRadius: 16,
                          fontSize: 13,
                          color: '#d4d4d8'
                        }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                {!session.summary && (
                  <div style={{ textAlign: 'center', padding: '64px 0' }}>
                    <p style={{ color: '#71717a', fontSize: 14 }}>Summary is being generated...</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transcript' && (
              <div>
                {segments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {segments.map((seg) => (
                      <div key={seg.id}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#71717a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {seg.speaker === 'you' ? 'You' : 'Participant'}
                        </div>
                        <p style={{ fontSize: 15, lineHeight: 1.6, color: '#d4d4d8', margin: 0 }}>{seg.text}</p>
                      </div>
                    ))}
                  </div>
                ) : session.merged_transcript ? (
                  <pre style={{ fontSize: 15, lineHeight: 1.6, color: '#d4d4d8', whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                    {session.merged_transcript}
                  </pre>
                ) : (
                  <div style={{ textAlign: 'center', padding: '64px 0' }}>
                    <p style={{ color: '#71717a', fontSize: 14 }}>No transcript available.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'actions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {actionItems.length > 0 ? (
                  <section>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                      Action Items
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#71717a' }}>
                        {actionItems.filter(i => i.completed).length}/{actionItems.length} done
                      </span>
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {actionItems.map((item, i) => (
                        <div key={i} style={{
                          padding: 16,
                          background: item.completed ? 'rgba(34, 197, 94, 0.05)' : '#18181b',
                          borderRadius: 10,
                          border: `1px solid ${item.completed ? 'rgba(34, 197, 94, 0.2)' : '#27272a'}`,
                          opacity: item.completed ? 0.7 : 1,
                          transition: 'all 0.2s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <button
                              onClick={() => handleToggleActionItem(i)}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 6,
                                border: `2px solid ${item.completed ? '#22c55e' : getPriorityColor(item.priority)}`,
                                background: item.completed ? '#22c55e' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: 2,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {item.completed && (
                                <CheckCircle2 size={14} style={{ color: 'white' }} />
                              )}
                            </button>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontSize: 15, 
                                color: item.completed ? '#71717a' : 'white', 
                                fontWeight: 500, 
                                marginBottom: 8,
                                textDecoration: item.completed ? 'line-through' : 'none'
                              }}>
                                {item.task}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#71717a' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <User size={12} />
                                  {item.owner}
                                </span>
                                {item.deadline && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={12} />
                                    {item.deadline}
                                  </span>
                                )}
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  background: `${getPriorityColor(item.priority)}20`,
                                  color: getPriorityColor(item.priority),
                                  textTransform: 'capitalize'
                                }}>
                                  {item.priority}
                                </span>
                              </div>
                              {item.context && (
                                <div style={{ marginTop: 8, fontSize: 13, color: '#525252', fontStyle: 'italic' }}>
                                  "{item.context}"
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {followUps.length > 0 && (
                  <section>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={18} style={{ color: '#eab308' }} />
                      Follow-ups for Next Meeting
                    </h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {followUps.map((item, i) => (
                        <li key={i} style={{ fontSize: 14, color: '#d4d4d8', paddingLeft: 16, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 0, color: '#eab308' }}>•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {openQuestions.length > 0 && (
                  <section>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={18} style={{ color: '#ef4444' }} />
                      Open Questions
                    </h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {openQuestions.map((item, i) => (
                        <li key={i} style={{ fontSize: 14, color: '#d4d4d8', paddingLeft: 16, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 0, color: '#ef4444' }}>?</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              </div>
            )}

            {activeTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16 }}>
                  {chats.length === 0 && !streamingText && (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#525252' }}>
                      <p style={{ fontSize: 14, margin: 0 }}>Ask questions about this meeting</p>
                      <p style={{ fontSize: 13, marginTop: 8, color: '#3f3f46' }}>
                        "What were the main decisions?"<br />
                        "Who is responsible for X?"<br />
                        "Summarize the discussion about Y"
                      </p>
                    </div>
                  )}

                  {chats.map((chat) => (
                    <div key={chat.id} style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start'
                    }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: chat.role === 'user' ? '#5b7fff' : '#27272a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {chat.role === 'user' ? (
                          <User size={14} color="white" />
                        ) : (
                          <Bot size={14} color="#a1a1aa" />
                        )}
                      </div>
                      <div style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: chat.role === 'user' ? 'rgba(91, 127, 255, 0.1)' : '#18181b',
                        borderRadius: 10,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: '#d4d4d8'
                      }}>
                        {chat.content}
                      </div>
                    </div>
                  ))}

                  {streamingText && (
                    <div style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start'
                    }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: '#27272a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Bot size={14} color="#a1a1aa" />
                      </div>
                      <div style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: '#18181b',
                        borderRadius: 10,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: '#d4d4d8'
                      }}>
                        {streamingText}
                        <span style={{ animation: 'blink 1s infinite' }}>▊</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                <div style={{
                  display: 'flex',
                  gap: 8,
                  padding: '12px 0',
                  borderTop: '1px solid #27272a'
                }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Ask about this meeting..."
                    disabled={chatLoading}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      background: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      color: 'white',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || chatLoading}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: chatInput.trim() && !chatLoading ? '#5b7fff' : '#27272a',
                      border: 'none',
                      cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Send size={16} color={chatInput.trim() && !chatLoading ? 'white' : '#525252'} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}


