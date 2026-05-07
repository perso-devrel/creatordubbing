const AI_DISCLOSURE_TEXT: Record<string, string> = {
  en: 'This video was dubbed by Dubtube using an AI voice clone.',
  ko: 'Dubtube에서 AI 보이스 클론으로 더빙되었습니다.',
  ja: 'DubtubeでAI音声クローンにより吹き替えられました。',
  zh: '本视频由 Dubtube 使用 AI 语音克隆配音。',
  es: 'Este video fue doblado por Dubtube con un clon de voz de IA.',
  pt: 'Este video foi dublado pela Dubtube com um clone de voz de IA.',
  fr: 'Cette vidéo a été doublée par Dubtube avec un clone vocal IA.',
  de: 'Dieses Video wurde von Dubtube mit einem KI-Stimmklon synchronisiert.',
  hi: 'इस वीडियो को Dubtube ने एआई वॉइस क्लोन से डब किया है।',
  id: 'Video ini didubbing oleh Dubtube dengan klon suara AI.',
  vi: 'Video này được Dubtube lồng tiếng bằng bản sao giọng nói AI.',
  th: 'วิดีโอนี้ได้รับการพากย์โดย Dubtube ด้วยเสียงโคลน AI',
  ms: 'Video ini dialih suara oleh Dubtube menggunakan klon suara AI.',
  fil: 'Ang video na ito ay dinub ng Dubtube gamit ang AI voice clone.',
  ta: 'இந்த வீடியோ Dubtube மூலம் AI குரல் குளோனைக் கொண்டு டப் செய்யப்பட்டது.',
  kk: 'Бұл видео Dubtube арқылы AI дауыс клонымен дубляждалды.',
  it: 'Questo video è stato doppiato da Dubtube con un clone vocale IA.',
  nl: 'Deze video is door Dubtube nagesynchroniseerd met een AI-stemkloon.',
  ru: 'Это видео дублировано в Dubtube с помощью ИИ-клона голоса.',
  uk: 'Це відео дубльовано в Dubtube за допомогою AI-клону голосу.',
  pl: 'Ten film został zdubbingowany przez Dubtube z użyciem klonu głosu AI.',
  cs: 'Toto video bylo nadabováno v Dubtube pomocí klonu hlasu AI.',
  sk: 'Toto video bolo nadabované v Dubtube pomocou klonu hlasu AI.',
  hu: 'Ezt a videót a Dubtube AI-hangklónnal szinkronizálta.',
  ro: 'Acest videoclip a fost dublat de Dubtube cu o clonă vocală AI.',
  bg: 'Този видеоклип е дублиран от Dubtube с AI клонинг на глас.',
  hr: 'Ovaj je video Dubtube sinkronizirao pomoću AI klona glasa.',
  el: 'Αυτό το βίντεο μεταγλωττίστηκε από το Dubtube με κλώνο φωνής AI.',
  sv: 'Den här videon dubbades av Dubtube med en AI-röstklon.',
  no: 'Denne videoen ble dubbet av Dubtube med en AI-stemmeklon.',
  da: 'Denne video er dubbet af Dubtube med en AI-stemmeklon.',
  fi: 'Tämä video on dubattu Dubtubella AI-äänikloonilla.',
  tr: 'Bu video Dubtube tarafından bir yapay zeka ses klonuyla dublajlandı.',
  ar: 'تمت دبلجة هذا الفيديو بواسطة Dubtube باستخدام نسخة صوتية بالذكاء الاصطناعي.',
}

const LEGACY_DISCLOSURE_TEXT = [
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
