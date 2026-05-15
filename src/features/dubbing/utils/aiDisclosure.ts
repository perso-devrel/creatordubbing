const AI_DISCLOSURE_TEXT: Record<string, string> = {
  en: 'This video was dubbed by sub2tube using an AI voice clone.',
  ko: 'sub2tube에서 AI를 활용하여 더빙되었습니다.',
  ja: 'sub2tubeでAI音声クローンにより吹き替えられました。',
  zh: '本视频由 sub2tube 使用 AI 语音克隆配音。',
  es: 'Este video fue doblado por sub2tube con un clon de voz de IA.',
  pt: 'Este video foi dublado pela sub2tube com um clone de voz de IA.',
  fr: 'Cette vidéo a été doublée par sub2tube avec un clone vocal IA.',
  de: 'Dieses Video wurde von sub2tube mit einem KI-Stimmklon synchronisiert.',
  hi: 'इस वीडियो को sub2tube ने एआई वॉइस क्लोन से डब किया है।',
  id: 'Video ini didubbing oleh sub2tube dengan klon suara AI.',
  vi: 'Video này được sub2tube lồng tiếng bằng bản sao giọng nói AI.',
  th: 'วิดีโอนี้ได้รับการพากย์โดย sub2tube ด้วยเสียงโคลน AI',
  ms: 'Video ini dialih suara oleh sub2tube menggunakan klon suara AI.',
  fil: 'Ang video na ito ay dinub ng sub2tube gamit ang AI voice clone.',
  ta: 'இந்த வீடியோ sub2tube மூலம் AI குரல் குளோனைக் கொண்டு டப் செய்யப்பட்டது.',
  kk: 'Бұл видео sub2tube арқылы AI дауыс клонымен дубляждалды.',
  it: 'Questo video è stato doppiato da sub2tube con un clone vocale IA.',
  nl: 'Deze video is door sub2tube nagesynchroniseerd met een AI-stemkloon.',
  ru: 'Это видео дублировано в sub2tube с помощью ИИ-клона голоса.',
  uk: 'Це відео дубльовано в sub2tube за допомогою AI-клону голосу.',
  pl: 'Ten film został zdubbingowany przez sub2tube z użyciem klonu głosu AI.',
  cs: 'Toto video bylo nadabováno v sub2tube pomocí klonu hlasu AI.',
  sk: 'Toto video bolo nadabované v sub2tube pomocou klonu hlasu AI.',
  hu: 'Ezt a videót a sub2tube AI-hangklónnal szinkronizálta.',
  ro: 'Acest videoclip a fost dublat de sub2tube cu o clonă vocală AI.',
  bg: 'Този видеоклип е дублиран от sub2tube с AI клонинг на глас.',
  hr: 'Ovaj je video sub2tube sinkronizirao pomoću AI klona glasa.',
  el: 'Αυτό το βίντεο μεταγλωττίστηκε από το sub2tube με κλώνο φωνής AI.',
  sv: 'Den här videon dubbades av sub2tube med en AI-röstklon.',
  no: 'Denne videoen ble dubbet av sub2tube med en AI-stemmeklon.',
  da: 'Denne video er dubbet af sub2tube med en AI-stemmeklon.',
  fi: 'Tämä video on dubattu sub2tubella AI-äänikloonilla.',
  tr: 'Bu video sub2tube tarafından bir yapay zeka ses klonuyla dublajlandı.',
  ar: 'تمت دبلجة هذا الفيديو بواسطة sub2tube باستخدام نسخة صوتية بالذكاء الاصطناعي.',
}

const LEGACY_DISCLOSURE_TEXT = [
  'Dubtube에서 AI 보이스 클론으로 더빙되었습니다.',
  'Dubtube에서 AI를 활용하여 더빙되었습니다.',
  '원본 영상에서 AI 보이스 클론으로 더빙되었습니다.',
]

function normalizeLanguageCode(languageCode: string): string {
  return languageCode.toLowerCase().split('-')[0]
}

export function getAiDisclosureText(languageCode: string): string {
  const code = normalizeLanguageCode(languageCode)
  return AI_DISCLOSURE_TEXT[code] ?? AI_DISCLOSURE_TEXT.en
}

export function appendTextFooter(description: string, footer: string): string {
  const cleanDescription = description.trimEnd()
  const cleanFooter = footer.trim()
  if (!cleanFooter) return cleanDescription
  return cleanDescription ? `${cleanDescription}\n\n${cleanFooter}` : cleanFooter
}

export function stripAiDisclosureFooter(description: string): string {
  const knownFooters = [
    ...Object.values(AI_DISCLOSURE_TEXT),
    ...LEGACY_DISCLOSURE_TEXT,
  ]
  let next = description

  for (const footer of knownFooters) {
    const cleanFooter = footer.trim()
    const trimmedEnd = next.trimEnd()
    if (trimmedEnd === cleanFooter) return ''

    const suffix = `\n\n${cleanFooter}`
    if (trimmedEnd.endsWith(suffix)) {
      next = trimmedEnd.slice(0, -suffix.length)
    }
  }

  return next
}

export function appendAiDisclosureFooter(
  description: string,
  languageCode: string,
  enabled: boolean,
): string {
  const baseDescription = stripAiDisclosureFooter(description)
  if (!enabled) return baseDescription
  return appendTextFooter(baseDescription, getAiDisclosureText(languageCode))
}
