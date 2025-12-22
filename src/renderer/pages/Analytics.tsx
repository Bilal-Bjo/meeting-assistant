import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, Video, Clock, Calendar, CheckCircle2 } from 'lucide-react'
import { meetingsDb, type DbMeeting } from '../lib/supabase'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface Props {
  onClose: () => void
}

export function Analytics({ onClose }: Props) {
  const [meetings, setMeetings] = useState<DbMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<string>('darwin')

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await meetingsDb.getAll()
    setMeetings(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    window.api.system.getPlatform().then(setPlatform)
  }, [loadData])

  const stats = computeStats(meetings)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#161616', position: 'relative', overflow: 'hidden' }}
    >
      {/* Ambient blue glows */}
      <div style={{
        position: 'absolute',
        top: '5%',
        left: '10%',
        width: 450,
        height: 450,
        background: 'radial-gradient(circle, rgba(91, 127, 255, 0.25) 0%, rgba(91, 127, 255, 0.08) 50%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '5%',
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(59, 91, 219, 0.2) 0%, rgba(59, 91, 219, 0.06) 50%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <header style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        paddingLeft: platform === 'darwin' ? 80 : 16,
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        gap: 12,
        WebkitAppRegion: 'drag'
      } as React.CSSProperties}>
        <button
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#525252',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 6,
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties}
        >
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>Analytics</span>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
            <div style={{ color: '#71717a', fontSize: 13 }}>Loading...</div>
          </div>
        ) : meetings.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center' }}>
            <TrendingUp style={{ width: 32, height: 32, color: '#52525b', marginBottom: 16 }} />
            <p style={{ fontSize: 14, color: '#71717a' }}>No data yet. Complete some meetings to see analytics.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <StatCard
                icon={<Video style={{ width: 18, height: 18 }} />}
                label="Total Meetings"
                value={stats.totalMeetings.toString()}
                subValue={`${stats.meetingsThisWeek} this week`}
              />
              <StatCard
                icon={<Clock style={{ width: 18, height: 18 }} />}
                label="Total Time"
                value={formatDurationShort(stats.totalDuration)}
                subValue={`avg ${formatDurationShort(stats.avgDuration)}`}
              />
              <StatCard
                icon={<Calendar style={{ width: 18, height: 18 }} />}
                label="This Month"
                value={stats.meetingsThisMonth.toString()}
                trend={stats.meetingsLastMonth > 0 
                  ? Math.round(((stats.meetingsThisMonth - stats.meetingsLastMonth) / stats.meetingsLastMonth) * 100)
                  : null
                }
              />
              <StatCard
                icon={<CheckCircle2 style={{ width: 18, height: 18 }} />}
                label="Action Items"
                value={`${stats.completedActionItems}/${stats.totalActionItems}`}
                subValue={stats.totalActionItems > 0 
                  ? `${Math.round((stats.completedActionItems / stats.totalActionItems) * 100)}% done`
                  : 'none yet'
                }
                valueColor={stats.completedActionItems === stats.totalActionItems && stats.totalActionItems > 0 ? '#22c55e' : undefined}
              />
            </div>

            <ChartCard title="Meetings Over Time">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.meetingsOverTime}>
                  <defs>
                    <linearGradient id="meetingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5b7fff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#5b7fff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1a1a1a', 
                      border: '1px solid #262626', 
                      borderRadius: 8,
                      fontSize: 12
                    }}
                    labelStyle={{ color: '#737373' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#5b7fff" 
                    strokeWidth={2}
                    fill="url(#meetingsGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Meetings by Day">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.meetingsByDay}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1a1a1a', 
                      border: '1px solid #262626', 
                      borderRadius: 8,
                      fontSize: 12
                    }}
                  />
                  <Bar dataKey="count" fill="#5b7fff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </main>
    </motion.div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subValue?: string
  trend?: number | null
  valueColor?: string
}

function StatCard({ icon, label, value, subValue, trend, valueColor }: StatCardProps) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.04)',
      borderRadius: 12,
      padding: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#525252' }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: valueColor || 'white', marginBottom: 4 }}>
        {value}
      </div>
      {subValue && (
        <div style={{ fontSize: 12, color: '#71717a' }}>
          {subValue}
        </div>
      )}
      {trend !== null && trend !== undefined && (
        <div style={{ 
          fontSize: 12, 
          color: trend >= 0 ? '#22c55e' : '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  )
}

interface ChartCardProps {
  title: string
  children: React.ReactNode
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.04)',
      borderRadius: 12,
      padding: 20
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#737373', marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

interface Stats {
  totalMeetings: number
  meetingsThisWeek: number
  meetingsThisMonth: number
  meetingsLastMonth: number
  avgDuration: number
  totalDuration: number
  totalActionItems: number
  completedActionItems: number
  meetingsOverTime: { label: string; count: number }[]
  meetingsByDay: { day: string; count: number }[]
}

function computeStats(meetings: DbMeeting[]): Stats {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const durations = meetings.map(m => m.duration_sec).filter(d => d > 0)
  const totalDuration = durations.reduce((a, b) => a + b, 0)
  const avgDuration = durations.length > 0 ? Math.round(totalDuration / durations.length) : 0

  const meetingsThisWeek = meetings.filter(m => new Date(m.created_at) >= weekAgo).length
  const meetingsThisMonth = meetings.filter(m => new Date(m.created_at) >= thisMonthStart).length
  const meetingsLastMonth = meetings.filter(m => {
    const d = new Date(m.created_at)
    return d >= lastMonthStart && d <= lastMonthEnd
  }).length

  let totalActionItems = 0
  let completedActionItems = 0
  meetings.forEach(m => {
    const items = m.action_items?.action_items || []
    totalActionItems += items.length
    completedActionItems += items.filter(i => i.completed).length
  })

  const last14Days: { label: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toDateString()
    const count = meetings.filter(m => new Date(m.created_at).toDateString() === dateStr).length
    last14Days.push({
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count
    })
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const meetingsByDay = dayNames.map(day => ({
    day,
    count: meetings.filter(m => dayNames[new Date(m.created_at).getDay()] === day).length
  }))

  return {
    totalMeetings: meetings.length,
    meetingsThisWeek,
    meetingsThisMonth,
    meetingsLastMonth,
    avgDuration,
    totalDuration,
    totalActionItems,
    completedActionItems,
    meetingsOverTime: last14Days,
    meetingsByDay
  }
}

function formatDurationShort(sec: number): string {
  if (!sec) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
