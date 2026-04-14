import { describe, it, expect } from 'vitest'
import { formatDuration, formatCurrency, formatNumber } from './formatters'

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(45)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(600)).toBe('10:00')
  })

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
    expect(formatDuration(7200)).toBe('2:00:00')
  })

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('floors fractional seconds', () => {
    expect(formatDuration(61.9)).toBe('1:01')
  })
})


describe('formatCurrency', () => {
  it('formats as USD', () => {
    const result = formatCurrency(9.99)
    expect(result).toContain('9.99')
    expect(result).toContain('$')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0.00')
  })
})

describe('formatNumber', () => {
  it('returns plain string for small numbers', () => {
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(0)).toBe('0')
  })

  it('formats thousands as K', () => {
    expect(formatNumber(1000)).toBe('1.0K')
    expect(formatNumber(1500)).toBe('1.5K')
    expect(formatNumber(999999)).toBe('1000.0K')
  })

  it('formats millions as M', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M')
    expect(formatNumber(2_500_000)).toBe('2.5M')
  })
})
