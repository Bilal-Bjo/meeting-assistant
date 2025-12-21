import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import logoSrc from '../assets/logo.jpg'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#09090b',
      position: 'relative',
      overflow: 'hidden',
    }}>
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

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ width: 380, position: 'relative', zIndex: 1 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
            <h1 style={{ 
              fontSize: 32, 
              fontWeight: 700, 
              color: 'white',
              letterSpacing: '-0.03em',
              margin: 0,
            }}>
              TLDM
            </h1>
          </div>
          <p style={{
            fontSize: 14,
            color: '#a1a1aa',
            marginTop: 0,
            fontWeight: 500,
          }}>
            Too Long; Didn't Meet
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <motion.div
              animate={{
                boxShadow: focusedField === 'email' 
                  ? '0 0 0 2px rgba(99, 102, 241, 0.3), 0 0 20px rgba(99, 102, 241, 0.1)' 
                  : '0 0 0 1px #27272a'
              }}
              transition={{ duration: 0.15 }}
              style={{ borderRadius: 10 }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="Email"
                required
                style={{
                  width: '100%',
                  height: 48,
                  padding: '0 16px',
                  background: '#18181b',
                  border: 'none',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
            </motion.div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <motion.div
              animate={{
                boxShadow: focusedField === 'password' 
                  ? '0 0 0 2px rgba(99, 102, 241, 0.3), 0 0 20px rgba(99, 102, 241, 0.1)' 
                  : '0 0 0 1px #27272a'
              }}
              transition={{ duration: 0.15 }}
              style={{ borderRadius: 10 }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Password"
                required
                style={{
                  width: '100%',
                  height: 48,
                  padding: '0 16px',
                  background: '#18181b',
                  border: 'none',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
            </motion.div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 10,
                color: '#f87171',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            style={{
              width: '100%',
              height: 48,
              background: 'linear-gradient(135deg, #5b7fff 0%, #3b5bdb 100%)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontSize: 15,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(91, 127, 255, 0.25)',
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign in'}
          </motion.button>
        </form>

        <div style={{
          marginTop: 32,
          height: 1,
          background: 'linear-gradient(90deg, transparent, #27272a, transparent)',
        }} />

        <p style={{
          textAlign: 'center',
          fontSize: 13,
          color: '#a1a1aa',
          marginTop: 20,
          fontWeight: 500,
        }}>
          Because 'quick sync' is never quick.
        </p>
      </motion.div>
    </div>
  )
}
