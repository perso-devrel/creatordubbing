'use client'

import { useState, useEffect, useCallback } from 'react'

const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || ''

export type ExtensionStatus = 'checking' | 'installed' | 'not-installed'

interface ChromeRuntime {
  sendMessage: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void
  lastError?: { message: string }
}

function getChromeRuntime(): ChromeRuntime | null {
  if (typeof globalThis !== 'undefined' && 'chrome' in globalThis) {
    const c = (globalThis as Record<string, unknown>).chrome as { runtime?: ChromeRuntime } | undefined
    return c?.runtime ?? null
  }
  return null
}

export function sendToExtension(message: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime()
    if (!EXTENSION_ID || !runtime) {
      reject(new Error('Chrome 확장 API를 사용할 수 없습니다'))
      return
    }
    runtime.sendMessage(EXTENSION_ID, message, (response: unknown) => {
      if (runtime.lastError) {
        reject(new Error(runtime.lastError.message))
      } else {
        resolve(response)
      }
    })
  })
}

export function getExtensionId(): string {
  return EXTENSION_ID
}

async function detectExtension(): Promise<{ status: ExtensionStatus; version: string | null }> {
  if (!EXTENSION_ID) {
    return { status: 'not-installed', version: null }
  }
  try {
    const response = await sendToExtension({ type: 'PING' }) as { ok?: boolean; version?: string }
    if (response?.ok) {
      return { status: 'installed', version: response.version ?? null }
    }
    return { status: 'not-installed', version: null }
  } catch {
    return { status: 'not-installed', version: null }
  }
}

export function useExtensionDetect() {
  const [status, setStatus] = useState<ExtensionStatus>('checking')
  const [version, setVersion] = useState<string | null>(null)

  const recheck = useCallback(() => {
    setStatus('checking')
    detectExtension().then((result) => {
      setStatus(result.status)
      setVersion(result.version)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    detectExtension().then((result) => {
      if (!cancelled) {
        setStatus(result.status)
        setVersion(result.version)
      }
    })
    return () => { cancelled = true }
  }, [])

  return { status, version, recheck, extensionId: EXTENSION_ID }
}
