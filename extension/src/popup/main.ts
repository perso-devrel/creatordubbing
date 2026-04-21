const statusEl = document.getElementById('status')!

async function init() {
  const manifest = chrome.runtime.getManifest()
  statusEl.textContent = `v${manifest.version} — 준비됨`
  statusEl.className = 'status ok'
}

init().catch((err) => {
  statusEl.textContent = `오류: ${err instanceof Error ? err.message : String(err)}`
  statusEl.className = 'status warn'
})
