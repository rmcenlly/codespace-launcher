'use strict'
// Generates build/icon.ico — the application icon used by electron-builder
// for the packaged exe and NSIS installer.  Uses the same SVG template and
// pipeline as the runtime icon generator.
const { readFileSync, writeFileSync, mkdirSync } = require('fs')
const { join } = require('path')

async function main() {
  const { Resvg } = require('@resvg/resvg-js')
  const { default: pngToIco } = await import('png-to-ico')

  const hue = 130 // sage green — matches the app accent colour
  const template = readFileSync(join(__dirname, '../resources/workspace-icon.svg'), 'utf-8')
  const svg = template.replaceAll('{{HUE}}', String(hue))

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 256 } })
  const pngBuffer = resvg.render().asPng()
  const icoBuffer = await pngToIco([pngBuffer])

  mkdirSync(join(__dirname, '../build'), { recursive: true })
  writeFileSync(join(__dirname, '../build/icon.ico'), icoBuffer)
  console.log('Generated build/icon.ico')
}

main().catch((e) => { console.error(e); process.exit(1) })
