export function toSRT(sentences: { startMs: number; endMs: number; translatedText: string }[]): string {
  return sentences.map((s, i) => {
    const start = msToSRTTime(s.startMs)
    const end = msToSRTTime(s.endMs)
    return `${i + 1}\n${start} --> ${end}\n${s.translatedText}\n`
  }).join('\n')
}

function msToSRTTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const ms2 = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms2).padStart(3, '0')}`
}
