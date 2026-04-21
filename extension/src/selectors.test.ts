import { describe, it, expect } from 'vitest'
import { ALL_SELECTORS, chain } from './selectors'

describe('SelectorChain structure', () => {
  it('all selectors have at least 3 candidates', () => {
    for (const sel of ALL_SELECTORS) {
      expect(sel.candidates.length, `${sel.name} should have >= 3 candidates`).toBeGreaterThanOrEqual(3)
    }
  })

  it('all selectors have unique names', () => {
    const names = ALL_SELECTORS.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('no selector has empty candidate strings', () => {
    for (const sel of ALL_SELECTORS) {
      for (const c of sel.candidates) {
        expect(c.trim().length, `${sel.name} has empty candidate`).toBeGreaterThan(0)
      }
    }
  })
})

describe('chain helper', () => {
  it('creates a SelectorChain', () => {
    const result = chain('test', '#a', '.b', '[c]')
    expect(result).toEqual({ name: 'test', candidates: ['#a', '.b', '[c]'] })
  })
})
