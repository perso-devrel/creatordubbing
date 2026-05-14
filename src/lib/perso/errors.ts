import 'server-only'

const TEMPORARY_SERVER_ERROR = '일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
const REQUEST_ERROR = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'

/**
 * Perso error code -> HTTP status + Korean user-facing message.
 * Keep these messages safe to show to users. Raw provider details should stay in logs only.
 */
export const ERROR_MAP: Record<string, { status: number; message: string }> = {
  // Subscription / permission
  PT0026: { status: 404, message: '구독 정보를 찾을 수 없습니다.' },
  PT0027: { status: 401, message: '인증되지 않은 계정입니다. 다시 로그인해 주세요.' },

  // Media
  F4004: { status: 400, message: '파일 크기가 허용 범위를 초과했습니다.' },
  F4008: { status: 400, message: '영상 길이가 허용 범위를 초과했습니다.' },
  F4009: { status: 400, message: '영상이 너무 짧습니다. 5초 이상인 영상을 사용해 주세요.' },
  F40010: { status: 400, message: '영상 해상도가 허용 범위를 초과했습니다.' },

  // Plan
  F4005: { status: 403, message: '플랜 사용량을 초과했습니다.' },

  // URL
  F4006: { status: 400, message: '올바른 링크가 아닙니다.' },
  F40016: { status: 400, message: '올바른 YouTube URL이 아닙니다.' },

  // Video restrictions
  F4032: { status: 403, message: '지원하지 않는 영상입니다.' },
  F4033: { status: 403, message: '연령 제한이 있는 영상입니다.' },

  // Credits
  VT4021: { status: 402, message: '더빙 시간이 부족합니다.' },

  // Languages
  VT4043: { status: 404, message: '지원하지 않는 원본 언어입니다.' },
  VT4044: { status: 404, message: '지원하지 않는 대상 언어입니다.' },

  VT4009: { status: 400, message: '선택한 언어와 음성 모델 조합이 지원되지 않습니다. 언어 선택을 줄이거나 다시 시도해 주세요.' },
  UNSUPPORTED_TTS_MODEL_PAIR: { status: 400, message: '선택한 언어와 음성 모델 조합이 지원되지 않습니다. 언어 선택을 줄이거나 다시 시도해 주세요.' },

  // Queue / temporary
  VT5034: { status: 503, message: '잠시 후 다시 시도해 주세요. 현재 작업량이 많습니다.' },
  TIMEOUT: { status: 504, message: '외부 처리 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.' },
  NETWORK_ERROR: { status: 502, message: '외부 처리 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
  INVALID_BODY: { status: 400, message: '입력값을 확인해 주세요.' },
  MISSING_PARAM: { status: 400, message: '필수 입력값이 누락되었습니다.' },
  INVALID_PARAM: { status: 400, message: '입력값 형식을 확인해 주세요.' },
  SRT_NOT_AVAILABLE: { status: 404, message: '자막 파일을 찾을 수 없습니다.' },
  SRT_FETCH_FAILED: { status: 502, message: '자막 파일을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
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

function fallbackMessage(status: number): string {
  if (status === 400) return '입력값을 확인해 주세요.'
  if (status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  if (status === 403) return '이 작업을 진행할 권한이 없습니다.'
  if (status === 404) return '요청한 정보를 찾을 수 없습니다.'
  if (status === 402) return '더빙 시간이 부족합니다.'
  if (status >= 500) return TEMPORARY_SERVER_ERROR
  return REQUEST_ERROR
}

function safeDetails(status: number, details: unknown): unknown | undefined {
  if (status >= 500) return undefined
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const record = details as Record<string, unknown>
    if ('issues' in record || 'fields' in record) return details
  }
  return undefined
}

/**
 * Normalize errors thrown in Perso route handlers.
 * Unknown provider messages are not exposed to clients because they may contain
 * implementation details from upstream APIs.
 */
export function mapPersoError(err: unknown): {
  status: number
  code: string
  message: string
  details?: unknown
} {
  if (err instanceof PersoError) {
    const mapped = ERROR_MAP[err.code]
    const status = mapped?.status ?? err.status
    return {
      status,
      code: err.code,
      message: mapped?.message ?? fallbackMessage(status),
      details: mapped ? safeDetails(status, err.details) : undefined,
    }
  }
  if (err instanceof Error) {
    return { status: 500, code: 'INTERNAL_ERROR', message: TEMPORARY_SERVER_ERROR }
  }
  return { status: 500, code: 'UNKNOWN', message: TEMPORARY_SERVER_ERROR }
}
