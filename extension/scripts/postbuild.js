import { copyFileSync, cpSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dist = resolve(root, 'dist')

copyFileSync(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'))

mkdirSync(resolve(dist, 'icons'), { recursive: true })
cpSync(resolve(root, 'public/icons'), resolve(dist, 'icons'), { recursive: true })

console.log('[postbuild] manifest.json + icons copied to dist/')
