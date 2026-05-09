import { describe, expect, it } from 'vitest'
import {
  USER_UPLOAD_FAILURE_MESSAGE,
  modeDescription,
  statusLabel,
  uploadStepLabel,
} from './labels'

describe('popup labels', () => {
  it('uses Store-ready mode descriptions', () => {
    expect(modeDescription(true)).toBe('자동 모드: 파일 추가 후 게시까지 진행')
    expect(modeDescription(false)).toBe('도움 모드: 파일 추가까지만 진행')
  })

  it('maps upload steps to friendly labels', () => {
    expect(uploadStepLabel('NAVIGATING')).toBe('페이지 여는 중')
    expect(uploadStepLabel('SELECTING_LANGUAGE')).toBe('언어 선택 중')
    expect(uploadStepLabel('INJECTING_AUDIO')).toBe('파일 추가 중')
    expect(uploadStepLabel('WAITING_PUBLISH')).toBe('게시 준비 중')
    expect(uploadStepLabel('PUBLISHING')).toBe('게시 중')
  })

  it('does not expose unknown raw step names', () => {
    expect(uploadStepLabel('INTERNAL_RAW_STEP')).toBe('진행 상황 확인 중')
    expect(uploadStepLabel()).toBe('')
  })

  it('maps job status to Korean labels', () => {
    expect(statusLabel('pending')).toBe('대기')
    expect(statusLabel('running')).toBe('진행 중')
    expect(statusLabel('done')).toBe('완료')
    expect(statusLabel('error')).toBe('오류')
  })

  it('uses a generic user-facing upload error', () => {
    expect(USER_UPLOAD_FAILURE_MESSAGE).toBe(
      '업로드를 완료하지 못했습니다. YouTube Studio에서 직접 확인해 주세요.',
    )
    expect(USER_UPLOAD_FAILURE_MESSAGE).not.toContain('Error')
  })
})
