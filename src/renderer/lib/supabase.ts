import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vdebprdvwpgruiuuxxci.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWJwcmR2d3BncnVpdXV4eGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyODAzMjUsImV4cCI6MjA4MTg1NjMyNX0.NiBX7MKa7GEwoGp3YLH88O_m3zl7PPDDJKHHDwjZVfc'

const electronStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: electronStorage,
    storageKey: 'tldm-auth',
  },
})

export type UserProfile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  onboarding_completed: boolean
}

// Meeting types
export interface DbMeeting {
  id: string
  user_id: string
  title: string
  created_at: string
  duration_sec: number
  merged_transcript: string | null
  summary: MeetingSummary | null
  action_items: MeetingActionItems | null
}

export interface MeetingSummary {
  title?: string
  summary?: string
  key_points?: string[]
  decisions?: string[]
  topics?: string[]
  participants_mentioned?: string[]
}

export interface MeetingActionItems {
  action_items?: ActionItem[]
  follow_ups?: string[]
  open_questions?: string[]
}

export interface ActionItem {
  task: string
  owner: string
  deadline?: string | null
  priority: 'high' | 'medium' | 'low'
  context?: string
  completed?: boolean
}

export interface DbMeetingSegment {
  id: string
  meeting_id: string
  speaker: 'you' | 'participant'
  text: string
  start_ms: number
  end_ms: number | null
}

export interface DbMeetingChat {
  id: string
  meeting_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// Meetings database helpers
export const meetingsDb = {
  async getAll(): Promise<DbMeeting[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async get(id: string): Promise<DbMeeting | null> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  },

  async create(title: string): Promise<DbMeeting | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('meetings')
      .insert({
        user_id: user.id,
        title,
        duration_sec: 0
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Pick<DbMeeting, 'title' | 'duration_sec' | 'merged_transcript' | 'summary' | 'action_items'>>): Promise<void> {
    const { error } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', id)

    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getSegments(meetingId: string): Promise<DbMeetingSegment[]> {
    const { data, error } = await supabase
      .from('meeting_segments')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('start_ms', { ascending: true })

    if (error) throw error
    return data || []
  },

  async addSegment(segment: Omit<DbMeetingSegment, 'id'>): Promise<DbMeetingSegment | null> {
    const { data, error } = await supabase
      .from('meeting_segments')
      .insert(segment)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getChats(meetingId: string): Promise<DbMeetingChat[]> {
    const { data, error } = await supabase
      .from('meeting_chats')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  async addChat(chat: Omit<DbMeetingChat, 'id' | 'created_at'>): Promise<DbMeetingChat | null> {
    const { data, error } = await supabase
      .from('meeting_chats')
      .insert(chat)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Settings helpers (reusing from shared Supabase)
export const settingsDb = {
  async get(): Promise<{
    openai_api_key?: string
    realtime_model?: string
    feedback_model?: string
    language?: string
  } | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
      .from('user_settings')
      .select('openai_api_key, realtime_model, feedback_model, language')
      .eq('user_id', user.id)
      .single()

    return data
  },

  async set(settings: {
    openai_api_key?: string
    realtime_model?: string
    feedback_model?: string
    language?: string
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString()
      })
  }
}

// Onboarding helpers
export const onboardingDb = {
  async isCompleted(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return true // Default to completed if no user

    const { data } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    return data?.onboarding_completed ?? false
  },

  async complete(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('user_profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)
  },

  async saveApiKey(apiKey: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        openai_api_key: apiKey,
        updated_at: new Date().toISOString()
      })
  }
}
