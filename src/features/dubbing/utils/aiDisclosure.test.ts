import { describe, expect, it } from 'vitest'
import {
  appendAiDisclosureFooter,
  appendTextFooter,
  getAiDisclosureText,
  stripAiDisclosureFooter,
} from './aiDisclosure'

describe('aiDisclosure', () => {
  it('returns localized disclosure text', () => {
    expect(getAiDisclosureText('ko')).toBe('sub2tube에서 AI를 활용하여 더빙되었습니다.')
    expect(getAiDisclosureText('ja')).toBe('sub2tubeでAI音声クローンにより吹き替えられました。')
    expect(getAiDisclosureText('pt-BR')).toBe('Este video foi dublado pela sub2tube com um clone de voz de IA.')
  })

  it('falls back to English for unknown language codes', () => {
    expect(getAiDisclosureText('unknown')).toBe('This video was dubbed by sub2tube using an AI voice clone.')
  })

  it('appends footers without changing the main description', () => {
    expect(appendTextFooter('사용자 설명', '원본 영상: https://youtube.com/watch?v=abc')).toBe(
      '사용자 설명\n\n원본 영상: https://youtube.com/watch?v=abc',
    )
  })

  it('strips only known disclosure footer text', () => {
    expect(stripAiDisclosureFooter('사용자 설명\n\nsub2tube에서 AI를 활용하여 더빙되었습니다.')).toBe('사용자 설명')
    // 레거시 'Dubtube' 문구가 들어간 영상 설명도 그대로 벗겨낼 수 있어야 한다 (브랜드 변경 전 업로드분).
    expect(stripAiDisclosureFooter('사용자 설명\n\nDubtube에서 AI 보이스 클론으로 더빙되었습니다.')).toBe('사용자 설명')
    expect(stripAiDisclosureFooter('사용자 설명\n\n원본 영상에서 AI 보이스 클론으로 더빙되었습니다.')).toBe('사용자 설명')
    expect(stripAiDisclosureFooter('사용자가 직접 작성한 설명')).toBe('사용자가 직접 작성한 설명')
  })

  it('preserves trailing spaces when no disclosure footer exists', () => {
    expect(stripAiDisclosureFooter('사용자 설명 ')).toBe('사용자 설명 ')
  })

  it('does not append disclosure when disabled', () => {
    expect(appendAiDisclosureFooter('사용자 설명', 'ko', false)).toBe('사용자 설명')
  })

  it('appends disclosure as a non-editable footer when enabled', () => {
    expect(appendAiDisclosureFooter('사용자 설명', 'ko', true)).toBe(
      '사용자 설명\n\nsub2tube에서 AI를 활용하여 더빙되었습니다.',
    )
  })
})
