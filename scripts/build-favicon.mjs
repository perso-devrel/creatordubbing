import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const SOURCE = 'public/logo.png'
const SIZES = [16, 32, 48, 64]

const pngs = await Promise.all(
  SIZES.map((size) =>
    sharp(SOURCE)
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toBuffer()
      .then((data) => ({ size, data })),
  ),
)

// ICO layout: ICONDIR(6) + N * ICONDIRENTRY(16) + PNG payloads.
const headerSize = 6 + 16 * pngs.length
let offset = headerSize
const dir = Buffer.alloc(headerSize)
dir.writeUInt16LE(0, 0)
dir.writeUInt16LE(1, 2)
dir.writeUInt16LE(pngs.length, 4)

pngs.forEach((p, i) => {
  const base = 6 + i * 16
  dir.writeUInt8(p.size === 256 ? 0 : p.size, base + 0)
  dir.writeUInt8(p.size === 256 ? 0 : p.size, base + 1)
  dir.writeUInt8(0, base + 2)
  dir.writeUInt8(0, base + 3)
  dir.writeUInt16LE(1, base + 4)
  dir.writeUInt16LE(32, base + 6)
  dir.writeUInt32LE(p.data.length, base + 8)
  dir.writeUInt32LE(offset, base + 12)
  offset += p.data.length
})

const ico = Buffer.concat([dir, ...pngs.map((p) => p.data)])
writeFileSync('src/app/favicon.ico', ico)
console.log('favicon.ico written:', ico.length, 'bytes,', pngs.length, 'sizes:', SIZES.join(','))
