export interface SrtCue {
  startMs: number
  endMs: number
  text: string
}

export function msToSRTTime(ms: number): string {
  const safe = Math.max(0, Math.floor(ms))
  const h = Math.floor(safe / 3600000)
  const m = Math.floor((safe % 3600000) / 60000)
  const s = Math.floor((safe % 60000) / 1000)
  const r = safe % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`
}

export function srtTimeToMs(timeStr: string): number | null {
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/)
  if (!m) return null
  return Number(m[1]) * 3600000 + Number(m[2]) * 60000 + Number(m[3]) * 1000 + Number(m[4].padEnd(3, '0'))
}

/** 표준 SRT 텍스트를 cue 배열로 파싱한다. 잘못된 블록은 건너뛴다. */
export function parseSRT(text: string): SrtCue[] {
  if (!text) return []
  const blocks = text.replace(/\r\n/g, '\n').replace(/^﻿/, '').trim().split(/\n\s*\n/)
  const cues: SrtCue[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 2) continue
    // 1번 줄이 인덱스가 아닐 수도 있어 timing 라인을 직접 찾는다
    const timingIdx = lines[0].includes('-->') ? 0 : 1
    if (timingIdx >= lines.length) continue
    const timing = lines[timingIdx].match(
      /(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/,
    )
    if (!timing) continue
    const startMs = srtTimeToMs(timing[1])
    const endMs = srtTimeToMs(timing[2])
    if (startMs === null || endMs === null) continue
    const textLines = lines.slice(timingIdx + 1).join('\n').trim()
    if (!textLines) continue
    cues.push({ startMs, endMs, text: textLines })
  }
  return cues
}

/** cue 배열을 표준 SRT 문자열로 직렬화한다. */
export function buildSRT(cues: SrtCue[]): string {
  return cues
    .map((c, i) => `${i + 1}\n${msToSRTTime(c.startMs)} --> ${msToSRTTime(c.endMs)}\n${c.text}`)
    .join('\n\n')
}

/** 호환성: 기존 호출자(`{ startMs, endMs, translatedText }[]` 형태)용 어댑터. */
export function toSRT(
  sentences: { startMs: number; endMs: number; translatedText: string }[],
): string {
  return buildSRT(
    sentences.map((s) => ({ startMs: s.startMs, endMs: s.endMs, text: s.translatedText })),
  )
}
