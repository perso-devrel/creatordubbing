import type { Job } from '../background-types'
import { USER_UPLOAD_FAILURE_MESSAGE } from '../messages'

export { USER_UPLOAD_FAILURE_MESSAGE }

const STEP_LABELS: Record<string, string> = {
  NAVIGATING: '페이지 여는 중',
  OPENING_LANGUAGES: '언어 설정 여는 중',
  SELECTING_LANGUAGE: '언어 선택 중',
  INJECTING_AUDIO: '파일 추가 중',
  WAITING_PUBLISH: '게시 준비 중',
  PUBLISHING: '게시 중',
  COMPLETED: '완료',
}

export function statusLabel(status: Job['status']): string {
  switch (status) {
    case 'pending':
      return '대기'
    case 'running':
      return '진행 중'
    case 'done':
      return '완료'
    case 'error':
      return '오류'
  }
}

export function uploadStepLabel(step?: string): string {
  if (!step) return ''
  return STEP_LABELS[step] ?? '진행 상황 확인 중'
}

export function modeDescription(isAuto: boolean): string {
  return isAuto
    ? '자동 모드: 파일 추가 후 게시까지 진행'
    : '도움 모드: 파일 추가까지만 진행'
}
