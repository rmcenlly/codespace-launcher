import { join } from 'path'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { Resvg } from '@resvg/resvg-js'
import { getIconsDir } from './settings'
import { is } from '@electron-toolkit/utils'

const RESOURCES_DIR = is.dev
  ? join(__dirname, '../../resources')
  : process.resourcesPath

// ── Index-based hue: groups of 3 at 120° apart, groups increment by 30° ──

function hueFromIndex(index) {
  const group = Math.floor(index / 3)
  const member = index % 3
  return (group * 30 + member * 120) % 360
}

// ── Generate and cache a colored ICO for a workspace ──────────────────────

/**
 * Returns the path to a cached .ico file for the given workspace.
 * Cache key includes the hue so it regenerates if the workspace's order changes.
 */
export async function generateFallbackIcon(workspaceId, index) {
  const iconsDir = getIconsDir()
  const hue = hueFromIndex(index)
  const iconPath = join(iconsDir, `_generated_${workspaceId}_h${hue}.ico`)

  if (existsSync(iconPath)) return iconPath

  const template = readFileSync(join(RESOURCES_DIR, 'workspace-icon.svg'), 'utf-8')
  const svg = template.replaceAll('{{HUE}}', String(hue))

  // SVG → PNG (256×256)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 256 }
  })
  const pngBuffer = resvg.render().asPng()

  // PNG → ICO — dynamic import because png-to-ico is ESM-only
  const { default: pngToIco } = await import('png-to-ico')
  const icoBuffer = await pngToIco([pngBuffer])
  writeFileSync(iconPath, icoBuffer)

  return iconPath
}

// ── Derive the cached icon path without generating ────────────────────────

export function generatedIconPath(workspaceId) {
  return join(getIconsDir(), `_generated_${workspaceId}.ico`)
}
