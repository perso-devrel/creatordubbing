// YouTube Studio content script
// Phase 3에서 업로드 자동화 로직 구현 예정

console.log('[CreatorDub] Content script loaded on YouTube Studio')

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[CreatorDub] Message from background:', message.type)
  sendResponse({ ok: false, error: 'NOT_IMPLEMENTED' })
  return true
})
