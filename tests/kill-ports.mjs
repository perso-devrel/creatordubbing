import { execSync } from 'child_process'

const PORTS = [3000, 3001, 3100, 3101, 5174]

for (const port of PORTS) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      encoding: 'utf8',
    })
    const pids = new Set()
    for (const line of out.split('\n')) {
      const m = line.match(/\s+(\d+)\s*$/)
      if (m) pids.add(m[1])
    }
    for (const pid of pids) {
      if (pid === '0') continue
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        console.log(`killed pid ${pid} on port ${port}`)
      } catch (e) {
        // already gone
      }
    }
  } catch {
    // port not in use
  }
}
console.log('done')
