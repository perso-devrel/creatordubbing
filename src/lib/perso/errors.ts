import 'server-only'

/**
 * Perso error code → HTTP status + Korean user-facing message.
 *
 * Source: perso-api-reference skill, table "에러 코드 → HTTP 상태 + 한국어 메시지 매핑"
 */
export const ERROR_MAP: Record<string, { status: number; message: string }> = {
  // 구독 / 권한
  PT0026: { status: 404, message: '구독 정보를 찾을 수 없습니다' },
  PT0027: { status: 401, message: '승인되지 않은 멤버입니다' },
  // 미디어
  F4004: { status: 400, message: '파일 크기가 한도를 초과했습니다' },
  F4008: { status: 400, message: '영상 길이가 한도를 초과했습니다' },
  F4009: { status: 400, message: '영상이 너무 짧습니다 (최소 5초)' },
  F40010: { status: 400, message: '해상도가 한도를 초과했습니다' },
  // 플랜
  F4005: { status: 403, message: '플랜 사용량을 초과했습니다' },
  // URL
  F4006: { status: 400, message: '잘못된 링크입니다' },
  F40016: { status: 400, message: '유효하지 않은 YouTube URL입니다' },
  // 외부 영상 제한
  F4032: { status: 403, message: '지역 제한된 영상입니다' },
  F4033: { status: 403, message: '연령 제한된 영상입니다' },
  // 크레딧
  VT4021: { status: 402, message: '크레딧이 부족합니다' },
  // 언어
  VT4043: { status: 404, message: '지원하지 않는 원본 언어입니다' },
  VT4044: { status: 404, message: '지원하지 않는 대상 언어입니다' },
  // 큐
  VT5034: {
    status: 503,
    message: '큐가 가득 찼습니다. 잠시 후 다시 시도해주세요',
  },
}

export class PersoError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'PersoError'
  }
}

/**
 * Normalize any error thrown in a route handler into { status, code, message }.
 * Uses ERROR_MAP when the code is known, otherwise falls back to the
 * original status/message from PersoError, or 500 for unknown errors.
 */
export function mapPersoError(err: unknown): {
  status: number
  code: string
  message: string
  details?: unknown
} {
  if (err instanceof PersoError) {
    const mapped = ERROR_MAP[err.code]
    if (mapped) {
      return {
        status: mapped.status,
        code: err.code,
        message: mapped.message,
        details: err.details,
      }
    }
    return {
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
    }
  }
  if (err instanceof Error) {
    return { status: 500, code: 'INTERNAL_ERROR', message: err.message }
  }
  return { status: 500, code: 'UNKNOWN', message: 'Internal Server Error' }
}
