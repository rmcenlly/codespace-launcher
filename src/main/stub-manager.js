import { join, basename, extname, dirname } from 'path'
import { existsSync, copyFileSync, readFileSync, writeFileSync, statSync } from 'fs'
import { spawn } from 'child_process'
import { getStubsDir, getIconsDir } from './settings'
import { generateFallbackIcon } from './icon-generator'
import { is } from '@electron-toolkit/utils'

const STUB_DIR = is.dev
  ? join(__dirname, '../../resources')
  : process.resourcesPath

// All files that must be copied alongside the stub exe
const STUB_FILES = ['stub.exe', 'stub.dll', 'stub.deps.json', 'stub.runtimeconfig.json']

// PNG/SVG first — Chromium renders these reliably as data URLs in <img> tags.
// ICO is last because Chromium's ICO data URL rendering is unreliable.
const DISPLAY_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico']

// LoadImage(IMAGE_ICON) in the stub only accepts ICO files.
const STAMP_EXTENSIONS = ['.ico']

function resolveIconWithExtensions(workspace, extensions) {
  if (workspace.icon && existsSync(workspace.icon) &&
      extensions.includes(extname(workspace.icon).toLowerCase())) {
    return workspace.icon
  }

  const workspacePath = workspace.path
  const isFile = workspacePath.endsWith('.code-workspace')
  const baseName = basename(workspacePath, extname(workspacePath))

  const relativeIconsDir = isFile
    ? join(dirname(workspacePath), 'icons')
    : join(workspacePath, 'icons')

  for (const ext of extensions) {
    const candidate = join(relativeIconsDir, baseName + ext)
    if (existsSync(candidate)) return candidate
  }

  const knownIconsDir = getIconsDir()
  for (const ext of extensions) {
    const candidate = join(knownIconsDir, baseName + ext)
    if (existsSync(candidate)) return candidate
  }

  return null
}

/** Resolve an icon path suitable for display in the launcher UI (PNG preferred). */
export function resolveDisplayIcon(workspace) {
  return resolveIconWithExtensions(workspace, DISPLAY_EXTENSIONS)
}

/** Resolve an icon path suitable for WM_SETICON in the stub (ICO only). */
export function resolveStampIcon(workspace) {
  return resolveIconWithExtensions(workspace, STAMP_EXTENSIONS)
}

/**
 * Build the display name for a workspace.
 * Children: "{Parent Name} - {Child Name}"
 */
export function buildDisplayName(workspace, parentWorkspace) {
  if (parentWorkspace) {
    return `${parentWorkspace.name} - ${workspace.name}`
  }
  return workspace.name
}

/**
 * Slugify a name for use as an AppUserModelID and stub filename.
 */
export function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Resolve a stamp-ready ICO path, converting a PNG if needed, or generating a fallback.
 * Converted ICOs are cached and refreshed when the source file changes.
 */
async function resolveStampIconWithFallback(workspace) {
  // 1. Direct ICO match
  const ico = resolveStampIcon(workspace)
  if (ico) return ico

  // 2. PNG display icon → convert to ICO (cached, refreshed on source change)
  const display = resolveDisplayIcon(workspace)
  if (display && display.toLowerCase().endsWith('.png')) {
    const convertedPath = join(getIconsDir(), `_converted_${workspace.id}.ico`)
    const srcMtime = statSync(display).mtimeMs
    const dstMtime = existsSync(convertedPath) ? statSync(convertedPath).mtimeMs : 0
    if (dstMtime < srcMtime) {
      const { default: pngToIco } = await import('png-to-ico')
      const icoBuffer = await pngToIco([readFileSync(display)])
      writeFileSync(convertedPath, icoBuffer)
    }
    return convertedPath
  }

  // 3. No usable icon — generate colored fallback using the workspace's stored color index
  return generateFallbackIcon(workspace.id, workspace.colorIndex ?? 0)
}

/**
 * Stamp the given icon onto a copy of stub.exe, then spawn it.
 */
export async function launchWorkspace(workspace, parentWorkspace = null) {
  const stubSource = join(STUB_DIR, 'stub.exe')
  if (!existsSync(stubSource)) {
    throw new Error(`stub.exe not found at: ${stubSource}`)
  }

  const stubId = workspace.id
  const stubsDir = getStubsDir()
  const stubDest = join(stubsDir, `${stubId}.exe`)
  const appId = `codespacelauncher.${stubId}`

  // Resolve icon — children inherit parent's icon.
  const targetWorkspace = parentWorkspace ?? workspace
  const iconSource = await resolveStampIconWithFallback(targetWorkspace)

  // Copy shared .NET files alongside — the exe bootstrap hardcodes 'stub.dll'
  // so these filenames must stay as-is. Multiple workspace exes share them.
  // Skip files that already exist — copying a loaded DLL causes EBUSY.
  for (const file of STUB_FILES.filter((f) => f !== 'stub.exe')) {
    const dest = join(stubsDir, file)
    if (!existsSync(dest)) copyFileSync(join(STUB_DIR, file), dest)
  }

  // All stubs share the same exe — no per-workspace exe needed anymore since
  // the stub no longer appears in the taskbar itself.
  copyFileSync(join(STUB_DIR, 'stub.exe'), stubDest)

  // The stub sets the icon directly on the VSCode window via WM_SETICON,
  // so only ICO files are usable here.
  const iconArg = iconSource?.endsWith('.ico') ? iconSource : null

  // Launch the stub
  const args = [
    '--workspace', workspace.path,
    '--app-id', appId
  ]
  if (iconArg) {
    args.push('--icon', iconArg)
  }

  const child = spawn(stubDest, args, { detached: true, stdio: 'ignore' })
  child.unref()

  return { success: true }
}
