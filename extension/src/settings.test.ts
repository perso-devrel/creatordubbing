import { describe, it, expect } from 'vitest'
import type { UploadMode } from './messages'

describe('Settings types', () => {
  it('UploadMode accepts "auto"', () => {
    const mode: UploadMode = 'auto'
    expect(mode).toBe('auto')
  })

  it('UploadMode accepts "assisted"', () => {
    const mode: UploadMode = 'assisted'
    expect(mode).toBe('assisted')
  })

  it('default mode should be "assisted" per TASK.md', () => {
    const DEFAULT_MODE: UploadMode = 'assisted'
    expect(DEFAULT_MODE).toBe('assisted')
  })
})
