import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { randomUUID } from 'crypto'
import type { Session, TranscriptSegment, MeetingChat } from '../shared/types'

let database: Database.Database

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'meeting-recorder.db')
  database = new Database(dbPath)
  database.pragma('journal_mode = WAL')

  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      duration_sec INTEGER DEFAULT 0,
      merged_transcript TEXT,
      summary TEXT,
      action_items TEXT
    );

    CREATE TABLE IF NOT EXISTS transcript_segments (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      speaker TEXT NOT NULL,
      text TEXT NOT NULL,
      start_ms INTEGER NOT NULL,
      end_ms INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meeting_chats (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_segments_session ON transcript_segments(session_id);
    CREATE INDEX IF NOT EXISTS idx_chats_session ON meeting_chats(session_id);
  `)
}

function parseJson<T>(str: string | null): T | undefined {
  if (!str) return undefined
  try {
    return JSON.parse(str) as T
  } catch {
    return undefined
  }
}

export const db = {
  getSessions(): Session[] {
    const rows = database.prepare(`
      SELECT * FROM sessions ORDER BY created_at DESC
    `).all() as Array<Record<string, unknown>>

    return rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      created_at: row.created_at as string,
      duration_sec: row.duration_sec as number,
      merged_transcript: row.merged_transcript as string | undefined,
      summary: parseJson(row.summary as string | null),
      action_items: parseJson(row.action_items as string | null),
    }))
  },

  getSession(id: string): Session | null {
    const row = database.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as Record<string, unknown> | undefined
    if (!row) return null

    return {
      id: row.id as string,
      title: row.title as string,
      created_at: row.created_at as string,
      duration_sec: row.duration_sec as number,
      merged_transcript: row.merged_transcript as string | undefined,
      summary: parseJson(row.summary as string | null),
      action_items: parseJson(row.action_items as string | null),
    }
  },

  createSession(title: string): Session {
    const id = randomUUID()
    const created_at = new Date().toISOString()

    database.prepare(`
      INSERT INTO sessions (id, title, created_at, duration_sec)
      VALUES (?, ?, ?, 0)
    `).run(id, title, created_at)

    return { id, title, created_at, duration_sec: 0 }
  },

  updateSession(id: string, updates: Partial<Session>): void {
    const fields: string[] = []
    const values: unknown[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title)
    }
    if (updates.duration_sec !== undefined) {
      fields.push('duration_sec = ?')
      values.push(updates.duration_sec)
    }
    if (updates.merged_transcript !== undefined) {
      fields.push('merged_transcript = ?')
      values.push(updates.merged_transcript)
    }

    if (fields.length === 0) return

    values.push(id)
    database.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  deleteSession(id: string): void {
    database.prepare(`DELETE FROM meeting_chats WHERE session_id = ?`).run(id)
    database.prepare(`DELETE FROM transcript_segments WHERE session_id = ?`).run(id)
    database.prepare(`DELETE FROM sessions WHERE id = ?`).run(id)
  },

  getTranscriptSegments(sessionId: string): TranscriptSegment[] {
    const rows = database.prepare(`
      SELECT * FROM transcript_segments WHERE session_id = ? ORDER BY start_ms ASC
    `).all(sessionId) as Array<Record<string, unknown>>

    return rows.map((row) => ({
      id: row.id as string,
      session_id: row.session_id as string,
      speaker: row.speaker as 'you' | 'lead',
      text: row.text as string,
      start_ms: row.start_ms as number,
      end_ms: row.end_ms as number | undefined,
    }))
  },

  addTranscriptSegment(segment: Omit<TranscriptSegment, 'id'>): TranscriptSegment {
    const id = randomUUID()

    database.prepare(`
      INSERT INTO transcript_segments (id, session_id, speaker, text, start_ms, end_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, segment.session_id, segment.speaker, segment.text, segment.start_ms, segment.end_ms ?? null)

    return { id, ...segment }
  },

  setSummary(sessionId: string, summary: Session['summary']): void {
    database.prepare(`UPDATE sessions SET summary = ? WHERE id = ?`).run(JSON.stringify(summary), sessionId)
  },

  setActionItems(sessionId: string, actionItems: Session['action_items']): void {
    database.prepare(`UPDATE sessions SET action_items = ? WHERE id = ?`).run(JSON.stringify(actionItems), sessionId)
  },

  getMeetingChats(sessionId: string): MeetingChat[] {
    const rows = database.prepare(`
      SELECT * FROM meeting_chats WHERE session_id = ? ORDER BY created_at ASC
    `).all(sessionId) as Array<Record<string, unknown>>

    return rows.map((row) => ({
      id: row.id as string,
      session_id: row.session_id as string,
      role: row.role as 'user' | 'assistant',
      content: row.content as string,
      created_at: row.created_at as string,
    }))
  },

  addMeetingChat(chat: Omit<MeetingChat, 'id' | 'created_at'>): MeetingChat {
    const id = randomUUID()
    const created_at = new Date().toISOString()

    database.prepare(`
      INSERT INTO meeting_chats (id, session_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, chat.session_id, chat.role, chat.content, created_at)

    return { id, created_at, ...chat }
  },
}
