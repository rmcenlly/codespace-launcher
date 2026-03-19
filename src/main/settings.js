import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'

const DATA_DIR = join(app.getPath('appData'), 'CodespaceLauncher')
const SETTINGS_FILE = join(DATA_DIR, 'settings.json')
const SHOW_ON_START_FILE = join(DATA_DIR, '.show-on-start')
const ICONS_DIR = join(DATA_DIR, 'icons')
const STUBS_DIR = join(DATA_DIR, 'stubs')

export function ensureDataDirs() {
  for (const dir of [DATA_DIR, ICONS_DIR, STUBS_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
}

export function readSettings() {
  ensureDataDirs()
  if (!existsSync(SETTINGS_FILE)) {
    return { workspaces: [] }
  }
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
  } catch {
    return { workspaces: [] }
  }
}

export function writeSettings(settings) {
  ensureDataDirs()
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
}

export function getStubsDir() {
  ensureDataDirs()
  return STUBS_DIR
}

export function getIconsDir() {
  ensureDataDirs()
  return ICONS_DIR
}

export function setShowOnStart() {
  ensureDataDirs()
  writeFileSync(SHOW_ON_START_FILE, '', 'utf-8')
}

export function checkAndClearShowOnStart() {
  if (existsSync(SHOW_ON_START_FILE)) {
    try { unlinkSync(SHOW_ON_START_FILE) } catch {}
    return true
  }
  return false
}
