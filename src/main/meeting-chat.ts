import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import { settingsStore } from './settings'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window
}

function isResponsesModel(model: string): boolean {
  return model.startsWith('gpt-5')
}

interface MeetingContext {
  transcript?: string
  summary?: unknown
  actionItems?: unknown
  chatHistory: Array<{ role: string; content: string }>
}

// New function that receives meeting context from renderer (for Supabase flow)
export async function chatWithMeetingContext(
  meetingId: string,
  userMessage: string,
  context: MeetingContext
): Promise<void> {
  const settings = settingsStore.get()
  if (!settings.openai_api_key) {
    emitChatResponse(meetingId, '', 'OpenAI API key not configured')
    return
  }

  const model = settings.feedback_model || 'gpt-4o'
  const lang = settings.language === 'nl' ? 'Dutch' : settings.language === 'fr' ? 'French' : 'English'

  const systemPrompt = `You are a helpful assistant that answers questions about a meeting. You have access to the full meeting transcript and should provide accurate, helpful answers based on what was discussed.

Meeting Transcript:
${context.transcript || 'No transcript available'}

${context.summary ? `Meeting Summary: ${JSON.stringify(context.summary)}` : ''}
${context.actionItems ? `Action Items: ${JSON.stringify(context.actionItems)}` : ''}

Instructions:
- Answer questions accurately based on the meeting content
- If something wasn't discussed in the meeting, say so
- Be concise but thorough
- Respond in ${lang}`

  // Build chat history including new user message
  const chatMessages = [
    ...context.chatHistory.map(c => ({ role: c.role, content: c.content })),
    { role: 'user', content: userMessage }
  ]

  try {
    const url = isResponsesModel(model)
      ? 'https://api.openai.com/v1/responses'
      : 'https://api.openai.com/v1/chat/completions'

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatMessages
    ]

    const body = isResponsesModel(model)
      ? {
          model,
          instructions: systemPrompt,
          input: chatMessages,
          stream: true,
        }
      : {
          model,
          messages,
          stream: true,
        }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.openai_api_key}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `OpenAI API error: ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.message || errorMessage
      } catch { /* ignore */ }
      emitChatResponse(meetingId, '', errorMessage)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      emitChatResponse(meetingId, '', 'Failed to read response stream')
      return
    }

    let fullResponse = ''
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '))

      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content ||
                         parsed.delta?.text ||
                         parsed.output_text ||
                         ''
          if (content) {
            fullResponse += content
            emitChatDelta(meetingId, content)
          }
        } catch { /* ignore parse errors */ }
      }
    }

    // Emit full response - renderer will save to Supabase
    emitChatResponse(meetingId, fullResponse)

  } catch (err) {
    emitChatResponse(meetingId, '', (err as Error).message)
  }
}

function emitChatDelta(meetingId: string, text: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.MEETING_CHAT_DELTA, { meetingId, text })
  }
}

function emitChatResponse(meetingId: string, text: string, error?: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.MEETING_CHAT_RESPONSE, { meetingId, text, error })
  }
}





