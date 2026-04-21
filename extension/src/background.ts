chrome.runtime.onInstalled.addListener(() => {
  console.log('[CreatorDub] Extension installed')
})

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version })
    return true
  }

  // TODO: UPLOAD_TO_YOUTUBE 메시지 처리 (Phase 3에서 구현)
  console.log('[CreatorDub] External message received:', message.type)
  sendResponse({ ok: false, error: 'NOT_IMPLEMENTED' })
  return true
})
