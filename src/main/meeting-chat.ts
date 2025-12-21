import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import { db } from './database'
import { settingsStore } from './settings'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window
}

function isResponsesModel(model: string): boolean {
  return model.startsWith('gpt-5')
}

export async function chatWithMeeting(sessionId: string, userMessage: string): Promise<void> {
  const settings = settingsStore.get()
  if (!settings.openai_api_key) {
    emitChatResponse(sessionId, '', 'OpenAI API key not configured')
    return
  }

  const session = db.getSession(sessionId)
  if (!session) {
    emitChatResponse(sessionId, '', 'Session not found')
    return
  }

  db.addMeetingChat({ session_id: sessionId, role: 'user', content: userMessage })

  const chatHistory = db.getMeetingChats(sessionId)
  const model = settings.feedback_model || 'gpt-4o'
  const lang = settings.language === 'nl' ? 'Dutch' : settings.language === 'fr' ? 'French' : 'English'

  const systemPrompt = `You are a helpful assistant that answers questions about a meeting. You have access to the full meeting transcript and should provide accurate, helpful answers based on what was discussed.

Meeting Transcript:
${session.merged_transcript || 'No transcript available'}

${session.summary ? `Meeting Summary: ${JSON.stringify(session.summary)}` : ''}
${session.action_items ? `Action Items: ${JSON.stringify(session.action_items)}` : ''}

Instructions:
- Answer questions accurately based on the meeting content
- If something wasn't discussed in the meeting, say so
- Be concise but thorough
- Respond in ${lang}`

  try {
    const url = isResponsesModel(model)
      ? 'https://api.openai.com/v1/responses'
      : 'https://api.openai.com/v1/chat/completions'

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(c => ({ role: c.role, content: c.content }))
    ]

    const body = isResponsesModel(model)
      ? {
          model,
          instructions: systemPrompt,
          input: chatHistory.map(c => ({ role: c.role, content: c.content })),
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
      emitChatResponse(sessionId, '', errorMessage)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      emitChatResponse(sessionId, '', 'Failed to read response stream')
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
            emitChatDelta(sessionId, content)
          }
        } catch { /* ignore parse errors */ }
      }
    }

    db.addMeetingChat({ session_id: sessionId, role: 'assistant', content: fullResponse })
    emitChatResponse(sessionId, fullResponse)

  } catch (err) {
    emitChatResponse(sessionId, '', (err as Error).message)
  }
}

function emitChatDelta(sessionId: string, text: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.MEETING_CHAT_DELTA, { sessionId, text })
  }
}

function emitChatResponse(sessionId: string, text: string, error?: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.MEETING_CHAT_RESPONSE, { sessionId, text, error })
  }
}



