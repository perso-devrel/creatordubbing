/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitForElement, sleep } from './dom-utils'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('waitForElement', () => {
  it('resolves immediately if element already exists', async () => {
    document.body.innerHTML = '<div id="target">hello</div>'
    const el = await waitForElement('#target')
    expect(el.textContent).toBe('hello')
  })

  it('resolves when element is added dynamically', async () => {
    const promise = waitForElement('#dynamic', { timeout: 3000 })

    setTimeout(() => {
      const div = document.createElement('div')
      div.id = 'dynamic'
      div.textContent = 'appeared'
      document.body.appendChild(div)
    }, 50)

    const el = await promise
    expect(el.textContent).toBe('appeared')
  })

  it('rejects on timeout if element never appears', async () => {
    await expect(
      waitForElement('#nonexistent', { timeout: 100 }),
    ).rejects.toThrow('timed out')
  })

  it('supports custom root element', async () => {
    const container = document.createElement('section')
    document.body.appendChild(container)

    const promise = waitForElement('.inner', { root: container, timeout: 2000 })

    setTimeout(() => {
      const span = document.createElement('span')
      span.className = 'inner'
      container.appendChild(span)
    }, 50)

    const el = await promise
    expect(el.className).toBe('inner')
  })

  it('does not find elements outside root', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    document.body.innerHTML += '<span class="outside"></span>'

    await expect(
      waitForElement('.outside', { root: container, timeout: 100 }),
    ).rejects.toThrow('timed out')
  })
})

describe('sleep', () => {
  it('resolves after specified delay', async () => {
    vi.useFakeTimers()
    const promise = sleep(500)
    vi.advanceTimersByTime(500)
    await promise
    vi.useRealTimers()
  })

  it('resolves with undefined', async () => {
    const result = await sleep(0)
    expect(result).toBeUndefined()
  })
})
