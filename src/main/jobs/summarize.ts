import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import { settingsStore } from '../settings'
import type { SessionSummary, SessionActionItems } from '../../shared/types'

function isResponsesModel(model: string): boolean {
  return model.startsWith('gpt-5')
}

async function parseErrorMessage(response: Response): Promise<string> {
  const errorText = await response.text()
  try {
    const errorJson = JSON.parse(errorText)
    return errorJson.error?.message || `OpenAI API error: ${response.status}`
  } catch {
    return `OpenAI API error: ${response.status}`
  }
}

interface JobQueue {
  meetingId: string
  transcript: string
}

const queue: JobQueue[] = []
let processing = false
let mainWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window
}

// New function for Supabase-based flow - emits results to renderer
export function processPostCall(meetingId: string, transcript: string): void {
  queue.push({ meetingId, transcript })
  processQueue()
}

async function processQueue(): Promise<void> {
  if (processing || queue.length === 0) return

  processing = true
  const job = queue.shift()!

  try {
    emitStatus(job.meetingId, 'generating_summary')

    const settings = settingsStore.get()
    if (!settings.openai_api_key) {
      throw new Error('OpenAI API key not configured')
    }

    const model = settings.feedback_model || 'gpt-4o'
    const [summary, actionItems] = await Promise.all([
      generateSummary(job.transcript, settings.openai_api_key, model, settings.language, settings.ai_context),
      generateActionItems(job.transcript, settings.openai_api_key, model, settings.language, settings.ai_context),
    ])

    // Emit results to renderer for saving to Supabase
    emitPostCallResult(job.meetingId, summary, actionItems)
    emitStatus(job.meetingId, 'complete')
  } catch (err) {
    console.error('Post-meeting job failed:', err)
    emitPostCallResult(job.meetingId, null, null, (err as Error).message)
    emitStatus(job.meetingId, 'error', (err as Error).message)
  } finally {
    processing = false
    processQueue()
  }
}

function emitStatus(meetingId: string, stage: string, error?: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.CALL_FINALIZE_STATUS, {
      sessionId: meetingId, // Keep sessionId for backwards compatibility with UI
      stage,
      error,
    })
  }
}

function emitPostCallResult(meetingId: string, summary: SessionSummary | null, actionItems: SessionActionItems | null, error?: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.POST_CALL_RESULT, {
      meetingId,
      summary,
      actionItems,
      error,
    })
  }
}

async function generateSummary(transcript: string, apiKey: string, model: string, language?: string, aiContext?: string): Promise<SessionSummary> {
  const lang = language === 'nl' ? 'Dutch' : language === 'fr' ? 'French' : 'English'
  const contextSection = aiContext ? `\n\nUser context (use this to better understand the meeting participants and their roles):\n${aiContext}\n` : ''
  const system = `You are a meeting analyzer. Given a transcript, generate a structured summary.${contextSection}
Return JSON with these fields:
- title: A short title for the meeting (max 50 chars)
- summary: A 2-4 sentence executive summary of what was discussed
- key_points: Array of 4-8 key discussion points
- decisions: Array of decisions made during the meeting
- topics: Array of main topics covered
- participants_mentioned: Array of names/roles mentioned in the meeting

Write all text fields in ${lang}.`

  const url = isResponsesModel(model)
    ? 'https://api.openai.com/v1/responses'
    : 'https://api.openai.com/v1/chat/completions'

  const body = isResponsesModel(model)
    ? {
        model,
        instructions: system,
        input: `Analyze this meeting transcript:\n\n${transcript}`,
        text: { format: { type: 'json_object' } },
        temperature: 0.3,
      }
    : {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Analyze this meeting transcript:\n\n${transcript}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }
  
  const data = await response.json()
  const content =
    data.choices?.[0]?.message?.content ??
    data.output_text ??
    data.output?.[0]?.content?.[0]?.text ??
    ''
  
  try {
    return JSON.parse(content) as SessionSummary
  } catch {
    return { summary: content }
  }
}

async function generateActionItems(transcript: string, apiKey: string, model: string, language?: string, aiContext?: string): Promise<SessionActionItems> {
  const lang = language === 'nl' ? 'Dutch' : language === 'fr' ? 'French' : 'English'
  const contextSection = aiContext ? `\n\nUser context (use this to better understand who the user is and assign tasks appropriately):\n${aiContext}\n` : ''
  const system = `You are a meeting action item extractor. Analyze the transcript and identify all action items, tasks, and follow-ups mentioned.${contextSection}
Return JSON with these fields:
- action_items: Array of objects with:
  - task: The specific task or action to be done
  - owner: Person responsible (if mentioned, otherwise "Unassigned")
  - deadline: Deadline if mentioned (otherwise null)
  - priority: "high", "medium", or "low" based on context
  - context: Brief context from the meeting about why this task exists
- follow_ups: Array of items that need follow-up discussion in future meetings
- open_questions: Array of questions raised but not answered in the meeting

Write all text fields in ${lang}. Be thorough - capture every actionable item mentioned.`

  const url = isResponsesModel(model)
    ? 'https://api.openai.com/v1/responses'
    : 'https://api.openai.com/v1/chat/completions'

  const body = isResponsesModel(model)
    ? {
        model,
        instructions: system,
        input: `Extract action items from this meeting transcript:\n\n${transcript}`,
        text: { format: { type: 'json_object' } },
        temperature: 0.3,
      }
    : {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Extract action items from this meeting transcript:\n\n${transcript}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }
  
  const data = await response.json()
  const content =
    data.choices?.[0]?.message?.content ??
    data.output_text ??
    data.output?.[0]?.content?.[0]?.text ??
    ''
  
  try {
    return JSON.parse(content) as SessionActionItems
  } catch {
    return { action_items: [], follow_ups: [], open_questions: [] }
  }
}
