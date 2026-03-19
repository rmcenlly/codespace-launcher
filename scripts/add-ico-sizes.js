'use strict'
// Reads the existing build/icon.ico, extracts the largest PNG image,
// and repacks it as a multi-size ICO (16, 32, 48, 256) so Windows can
// pick the right size for each context instead of scaling from 256.
const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')
const { PNG } = require('pngjs')

async function main() {
  const { default: pngToIco } = await import('png-to-ico')

  const icoPath = join(__dirname, '../build/icon.ico')
  const icoBuffer = readFileSync(icoPath)

  // Parse ICO directory to find the largest PNG-encoded image
  const count = icoBuffer.readUInt16LE(4)
  let largestPng = null
  let largestSize = 0

  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16
    const width = icoBuffer[entry] || 256   // 0 in the field means 256
    const height = icoBuffer[entry + 1] || 256
    const dataSize = icoBuffer.readUInt32LE(entry + 8)
    const dataOffset = icoBuffer.readUInt32LE(entry + 12)
    const data = icoBuffer.slice(dataOffset, dataOffset + dataSize)

    const isPng = data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47
    if (isPng && Math.max(width, height) > largestSize) {
      largestSize = Math.max(width, height)
      largestPng = data
    }
  }

  if (!largestPng) {
    throw new Error('No PNG-encoded entry found in ICO — file may use BMP internally')
  }

  const src = PNG.sync.read(largestPng)

  function resize(src, dstW, dstH) {
    const dst = new PNG({ width: dstW, height: dstH })
    for (let y = 0; y < dstH; y++) {
      for (let x = 0; x < dstW; x++) {
        const sx = (x + 0.5) * src.width / dstW - 0.5
        const sy = (y + 0.5) * src.height / dstH - 0.5
        const x0 = Math.max(0, Math.floor(sx))
        const x1 = Math.min(src.width - 1, x0 + 1)
        const y0 = Math.max(0, Math.floor(sy))
        const y1 = Math.min(src.height - 1, y0 + 1)
        const fx = sx - x0
        const fy = sy - y0
        const di = (y * dstW + x) * 4
        for (let c = 0; c < 4; c++) {
          const tl = src.data[(y0 * src.width + x0) * 4 + c]
          const tr = src.data[(y0 * src.width + x1) * 4 + c]
          const bl = src.data[(y1 * src.width + x0) * 4 + c]
          const br = src.data[(y1 * src.width + x1) * 4 + c]
          dst.data[di + c] = Math.round(tl * (1-fx)*(1-fy) + tr * fx*(1-fy) + bl * (1-fx)*fy + br * fx*fy)
        }
      }
    }
    return PNG.sync.write(dst)
  }

  const sizes = [16, 32, 48, 256]
  const pngs = sizes.map((s) => (s === largestSize ? largestPng : resize(src, s, s)))

  writeFileSync(icoPath, await pngToIco(pngs))
  console.log(`build/icon.ico repacked with sizes: ${sizes.join(', ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
