import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Check, Eye, EyeOff } from 'lucide-react'
import { onboardingDb } from '../lib/supabase'

interface Props {
  onComplete: () => void
}

interface Step {
  title: string
  description: string
}

const steps: Step[] = [
  {
    title: 'Capture every word',
    description: 'Start a meeting and we transcribe everything in real-time. Both your voice and system audio are captured so nothing gets missed.'
  },
  {
    title: 'AI-powered summaries',
    description: 'When your meeting ends, AI instantly generates a summary with key points, decisions, and topics discussed. No more manual note-taking.'
  },
  {
    title: 'Action items extracted',
    description: 'Never lose track of follow-ups. We automatically identify action items, assign owners, and track deadlines from your conversations.'
  }
]

export function Onboarding({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string>('darwin')

  const isApiKeyStep = currentStep === steps.length
  const totalSteps = steps.length + 1

  useEffect(() => {
    window.api.system.getPlatform().then(setPlatform)
  }, [])

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key')
      return
    }

    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onboardingDb.saveApiKey(apiKey.trim())
      await onboardingDb.complete()
      await window.api.settings.set({ openai_api_key: apiKey.trim() })
      onComplete()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#09090b',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow - top left */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '20%',
        width: 700,
        height: 700,
        background: 'radial-gradient(circle, rgba(91, 127, 255, 0.35) 0%, rgba(91, 127, 255, 0.15) 30%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />

      {/* Ambient glow - bottom right */}
      <div style={{
        position: 'absolute',
        bottom: '5%',
        right: '15%',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(59, 91, 219, 0.3) 0%, rgba(59, 91, 219, 0.12) 30%, transparent 70%)',
        filter: 'blur(90px)',
        pointerEvents: 'none',
      }} />

      {/* Drag region */}
      <div style={{
        height: 52,
        WebkitAppRegion: 'drag',
        paddingLeft: platform === 'darwin' ? 80 : 16,
        flexShrink: 0
      } as React.CSSProperties} />

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            width: 440,
            textAlign: 'center',
          }}
        >
          <AnimatePresence mode="wait">
            {!isApiKeyStep ? (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Title */}
                <h1 style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: 'white',
                  margin: '0 0 16px',
                  letterSpacing: '-0.02em',
                }}>
                  {steps[currentStep].title}
                </h1>

                {/* Description */}
                <p style={{
                  fontSize: 16,
                  color: '#a1a1aa',
                  lineHeight: 1.7,
                  margin: 0,
                }}>
                  {steps[currentStep].description}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="api-key"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Title */}
                <h1 style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: 'white',
                  margin: '0 0 16px',
                  letterSpacing: '-0.02em',
                }}>
                  One last thing
                </h1>

                {/* Description */}
                <p style={{
                  fontSize: 16,
                  color: '#a1a1aa',
                  lineHeight: 1.7,
                  margin: '0 0 28px',
                }}>
                  Add your OpenAI API key to power transcription and AI summaries.
                </p>

                {/* API Key input */}
                <div style={{ maxWidth: 360, margin: '0 auto', textAlign: 'left' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value)
                        setError(null)
                      }}
                      placeholder="sk-..."
                      autoFocus
                      style={{
                        width: '100%',
                        height: 48,
                        padding: '0 44px 0 16px',
                        background: '#18181b',
                        border: error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid #27272a',
                        borderRadius: 10,
                        color: 'white',
                        fontSize: 14,
                        fontFamily: 'monospace',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                      }}
                      onFocus={(e) => {
                        if (!error) {
                          e.target.style.borderColor = 'rgba(91, 127, 255, 0.4)'
                          e.target.style.boxShadow = '0 0 0 2px rgba(91, 127, 255, 0.15)'
                        }
                      }}
                      onBlur={(e) => {
                        if (!error) {
                          e.target.style.borderColor = '#27272a'
                          e.target.style.boxShadow = 'none'
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleComplete()
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#52525b',
                        padding: 4,
                        display: 'flex'
                      }}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {error && (
                    <p style={{ fontSize: 12, color: '#ef4444', margin: '8px 0 0' }}>
                      {error}
                    </p>
                  )}

                  <p style={{
                    fontSize: 12,
                    color: '#52525b',
                    margin: '12px 0 0',
                    textAlign: 'center'
                  }}>
                    Get your key at{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#5b7fff', textDecoration: 'none' }}
                    >
                      platform.openai.com
                    </a>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginTop: 48
          }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  height: 44,
                  padding: '0 16px',
                  background: 'transparent',
                  border: '1px solid #27272a',
                  borderRadius: 10,
                  color: '#a1a1aa',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}

            {!isApiKeyStep ? (
              <motion.button
                onClick={handleNext}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                style={{
                  height: 44,
                  padding: '0 24px',
                  background: 'linear-gradient(135deg, #5b7fff 0%, #3b5bdb 100%)',
                  border: 'none',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(91, 127, 255, 0.25)',
                }}
              >
                Continue
                <ChevronRight size={16} />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleComplete}
                disabled={saving}
                whileHover={!saving ? { scale: 1.01 } : {}}
                whileTap={!saving ? { scale: 0.99 } : {}}
                style={{
                  height: 44,
                  padding: '0 24px',
                  background: saving ? 'rgba(91, 127, 255, 0.5)' : 'linear-gradient(135deg, #5b7fff 0%, #3b5bdb 100%)',
                  border: 'none',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: saving ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: saving ? 'none' : '0 4px 12px rgba(91, 127, 255, 0.25)',
                }}
              >
                {saving ? 'Saving...' : 'Get Started'}
                {!saving && <Check size={16} />}
              </motion.button>
            )}
          </div>

          {/* Step dots */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginTop: 32
          }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentStep ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === currentStep ? '#5b7fff' : '#27272a',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      <style>{`
        input::placeholder {
          color: #3f3f46;
        }
      `}</style>
    </div>
  )
}
