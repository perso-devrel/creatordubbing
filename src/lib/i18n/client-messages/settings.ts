import type { LocalizedText } from '../text'

export const settingsMessages = {
  "app.app.settings.page.manageDisplayLanguageAndYouTubeDefaults": { ko: "화면 언어와 YouTube 기본값을 관리하세요.", en: "Manage display language and YouTube defaults." },
  "app.app.settings.page.settings": { ko: "설정", en: "Settings" },
} as const satisfies Record<string, LocalizedText>
