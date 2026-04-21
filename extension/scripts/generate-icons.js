/**
 * Generates placeholder PNG icons for the Chrome extension.
 * Run: node scripts/generate-icons.js
 *
 * Creates simple "CD" text icons in 16x16, 48x48, 128x128.
 * Uses raw PNG encoding (no canvas dependency).
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = resolve(__dirname, '../public/icons')

// Minimal 1-bit PNG generator for solid color squares with "CD" feel
function createPng(size) {
  // Simple solid-color PNG with IHDR, IDAT (uncompressed), IEND
  const brand = [0x6b, 0x5c, 0xf9] // #6B5CF9 (brand purple)
  const white = [0xff, 0xff, 0xff]

  // Create raw pixel data (RGBA)
  const pixels = []
  for (let y = 0; y < size; y++) {
    pixels.push(0) // filter byte
    for (let x = 0; x < size; x++) {
      // Simple "C" shape in left half, "D" shape in right half
      const cx = x / size
      const cy = y / size
      const inBorder = cx < 0.08 || cx > 0.92 || cy < 0.08 || cy > 0.92
      const inCenter = cx > 0.25 && cx < 0.75 && cy > 0.25 && cy < 0.75

      let color
      if (inBorder) {
        color = brand
      } else if (inCenter) {
        color = white
      } else {
        color = brand
      }

      pixels.push(color[0], color[1], color[2], 0xff)
    }
  }

  return encodePng(size, size, Buffer.from(pixels))
}

function encodePng(width, height, rawData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type (RGBA)
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr)

  // IDAT — use zlib deflate
  const { deflateSync } = await_import_zlib()
  const compressed = deflateSync(rawData)
  const idatChunk = makeChunk('IDAT', compressed)

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const crcInput = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput), 0)

  return Buffer.concat([length, typeBuffer, data, crc])
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function await_import_zlib() {
  // Dynamic import workaround for ESM
  const zlib = require('zlib')
  return zlib
}

// Use createRequire for ESM compat
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

mkdirSync(ICONS_DIR, { recursive: true })

for (const size of [16, 48, 128]) {
  const png = createPng(size)
  const path = resolve(ICONS_DIR, `icon-${size}.png`)
  writeFileSync(path, png)
  console.log(`Generated ${path} (${png.length} bytes)`)
}
