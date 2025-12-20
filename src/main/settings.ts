import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { Settings } from '../shared/types'

const DEFAULT_SETTINGS: Settings = {
  openai_api_key: '',
  realtime_model: 'gpt-4o-realtime-preview',
  feedback_model: 'gpt-4o',
  language: 'en',
  irl_mode: false,
  system_audio_mode: process.platform === 'darwin' ? 'blackhole' : 'wasapi',
}

let settings: Settings = { ...DEFAULT_SETTINGS }

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'meeting-recorder-settings.json')
}

function load(): void {
  try {
    const settingsPath = getSettingsPath()
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8')
      const loaded = JSON.parse(data) as Partial<Settings>
      settings = { ...DEFAULT_SETTINGS, ...loaded }
    }
  } catch {
    settings = { ...DEFAULT_SETTINGS }
  }
}

function save(): void {
  try {
    const settingsPath = getSettingsPath()
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save settings:', err)
  }
}

load()

export const settingsStore = {
  get(): Settings {
    return { ...settings }
  },

  set(updates: Partial<Settings>): void {
    settings = { ...settings, ...updates }
    save()
  },
}
