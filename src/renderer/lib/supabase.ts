import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vdebprdvwpgruiuuxxci.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWJwcmR2d3BncnVpdXV4eGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyODAzMjUsImV4cCI6MjA4MTg1NjMyNX0.NiBX7MKa7GEwoGp3YLH88O_m3zl7PPDDJKHHDwjZVfc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

export type UserProfile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

