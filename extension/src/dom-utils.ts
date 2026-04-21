export interface WaitForElementOptions {
  timeout?: number
  root?: ParentNode
}

const DEFAULT_TIMEOUT = 10_000

export function waitForElement<T extends Element = Element>(
  selector: string,
  options: WaitForElementOptions = {},
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, root = document } = options

  const existing = root.querySelector<T>(selector)
  if (existing) return Promise.resolve(existing)

  return new Promise<T>((resolve, reject) => {
    let settled = false

    const observer = new MutationObserver(() => {
      const el = root.querySelector<T>(selector)
      if (el) {
        settled = true
        observer.disconnect()
        resolve(el)
      }
    })

    observer.observe(root instanceof Node ? root : document, {
      childList: true,
      subtree: true,
    })

    setTimeout(() => {
      if (!settled) {
        observer.disconnect()
        reject(new Error(`waitForElement("${selector}") timed out after ${timeout}ms`))
      }
    }, timeout)
  })
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
