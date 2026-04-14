type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  msg: string
  ts: string
  [key: string]: unknown
}

function emit(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...extra,
  }

  const out = level === 'error' ? console.error : console.log
  if (process.env.NODE_ENV === 'production') {
    out(JSON.stringify(entry))
  } else {
    const tag = level.toUpperCase().padEnd(5)
    const parts = extra
      ? ' ' + Object.entries(extra).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')
      : ''
    out(`[${entry.ts}] ${tag} ${msg}${parts}`)
  }
}

export const logger = {
  info: (msg: string, extra?: Record<string, unknown>) => emit('info', msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => emit('warn', msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => emit('error', msg, extra),
}
