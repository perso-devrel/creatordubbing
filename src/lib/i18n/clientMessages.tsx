'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { commonMessages } from '@/lib/i18n/client-messages/common'
import type { AppLocale } from '@/lib/i18n/config'
import { text, type LocalizedText } from '@/lib/i18n/text'

export type MessageKey = string
export type MessageParams = Record<string, string | number | boolean | null | undefined>
export type ClientMessageMap = Record<string, LocalizedText>

const ClientMessagesContext = createContext<ClientMessageMap>(commonMessages)

export function ClientMessagesProvider({
  messages,
  children,
}: {
  messages: ClientMessageMap
  children: ReactNode
}) {
  const parentMessages = useContext(ClientMessagesContext)
  const value = useMemo(
    () => ({ ...parentMessages, ...messages }),
    [parentMessages, messages],
  )

  return (
    <ClientMessagesContext.Provider value={value}>
      {children}
    </ClientMessagesContext.Provider>
  )
}

export function useClientMessages(): ClientMessageMap {
  return useContext(ClientMessagesContext)
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template
  return template.replace(/\{([A-Za-z_$][\w$]*)\}/g, (match, key) => {
    const value = params[key]
    return value === null || value === undefined ? match : String(value)
  })
}

export function resolveClientMessage(
  messages: ClientMessageMap,
  locale: AppLocale,
  key: string,
  params?: MessageParams,
): string | null {
  const value = messages[key]
  if (!value) {
    if (process.env.NODE_ENV !== 'production' && key.includes('.')) {
      console.warn(`[i18n] Missing client message key: ${key}`)
    }
    return null
  }
  return interpolate(text(locale, value), params)
}
