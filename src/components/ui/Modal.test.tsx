import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Modal } from './Modal'

describe('Modal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
    document.body.style.overflow = ''
  })

  afterEach(cleanup)

  it('renders nothing when closed', () => {
    const { container } = render(<Modal open={false} onClose={onClose}>content</Modal>)
    expect(container.innerHTML).toBe('')
  })

  it('renders content when open', () => {
    render(<Modal open onClose={onClose}>hello</Modal>)
    expect(screen.getByText('hello')).toBeTruthy()
  })

  it('renders title and close button', () => {
    render(<Modal open onClose={onClose} title="My Title">body</Modal>)
    expect(screen.getByText('My Title')).toBeTruthy()
    expect(screen.getByLabelText('닫기')).toBeTruthy()
  })

  it('has role="dialog" and aria-modal', () => {
    render(<Modal open onClose={onClose} title="Test">body</Modal>)
    const dialogs = screen.getAllByRole('dialog')
    const dialog = dialogs[0]
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Test')
  })

  it('calls onClose on Escape key', () => {
    const { container } = render(<Modal open onClose={onClose}>body</Modal>)
    fireEvent.keyDown(container.ownerDocument, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop clicked', () => {
    render(<Modal open onClose={onClose}>body</Modal>)
    const backdrop = document.querySelector('[aria-hidden="true"]')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks body scroll when open', () => {
    render(<Modal open onClose={onClose}>body</Modal>)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('focus traps: Tab wraps from last to first focusable', () => {
    render(
      <Modal open onClose={onClose} title="Trap">
        <button data-testid="btn1">First</button>
        <button data-testid="btn2">Second</button>
      </Modal>,
    )
    const btn2 = screen.getByTestId('btn2')
    btn2.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByLabelText('닫기'))
  })

  it('focus traps: Shift+Tab wraps from first to last focusable', () => {
    render(
      <Modal open onClose={onClose} title="Trap">
        <button data-testid="btn1">First</button>
        <button data-testid="btn2">Second</button>
      </Modal>,
    )
    const closeBtn = screen.getByLabelText('닫기')
    closeBtn.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByTestId('btn2'))
  })

  it('auto-focuses first focusable element on open', () => {
    render(
      <Modal open onClose={onClose} title="Focus">
        <input data-testid="input1" />
      </Modal>,
    )
    expect(document.activeElement).toBe(screen.getByLabelText('닫기'))
  })

  it('focuses dialog panel when no focusable children exist', () => {
    render(<Modal open onClose={onClose}><p>no buttons</p></Modal>)
    const panel = document.querySelector('[tabindex="-1"]')!
    expect(document.activeElement).toBe(panel)
  })

  it('prevents Tab when there are no focusable elements', () => {
    render(<Modal open onClose={onClose}><p>text only</p></Modal>)
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true })
    const spy = vi.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)
    expect(spy).toHaveBeenCalled()
  })
})
