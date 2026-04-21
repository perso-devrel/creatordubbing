import type { UploadMode } from './messages'

const SETTINGS_KEY = 'creatordub_settings'

export interface Settings {
  uploadMode: UploadMode
}

const DEFAULTS: Settings = {
  uploadMode: 'assisted',
}

export async function getSettings(): Promise<Settings> {
  const { [SETTINGS_KEY]: stored } = await chrome.storage.local.get(SETTINGS_KEY)
  if (stored && typeof stored === 'object') {
    return { ...DEFAULTS, ...stored }
  }
  return { ...DEFAULTS }
}

export async function getUploadMode(): Promise<UploadMode> {
  const settings = await getSettings()
  return settings.uploadMode
}

export async function setUploadMode(mode: UploadMode): Promise<void> {
  const settings = await getSettings()
  settings.uploadMode = mode
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}
