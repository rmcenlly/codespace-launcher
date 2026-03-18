import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, extname, dirname } from 'path'
import { initUpdater } from './updater'
import { readFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readSettings, writeSettings } from './settings'
import { launchWorkspace, resolveDisplayIcon } from './stub-manager'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.codespacelauncher')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC: settings
  ipcMain.handle('settings:read', () => {
    const settings = readSettings()

    // Assign colorIndex only to workspaces that have no resolved icon.
    // Uses resolveDisplayIcon (filesystem check) so icon: null workspaces with
    // a matching icon file are correctly treated as "has icon".
    const used = new Set(
      settings.workspaces
        .filter((ws) => !resolveDisplayIcon(ws))
        .map((ws) => ws.colorIndex)
        .filter(Number.isInteger)
    )

    let needsSave = false
    settings.workspaces = settings.workspaces.map((ws) => {
      const hasIcon = !!resolveDisplayIcon(ws)

      // Has a real icon but was incorrectly assigned a colorIndex — clear it
      if (hasIcon && Number.isInteger(ws.colorIndex)) {
        needsSave = true
        const { colorIndex: _removed, ...rest } = ws
        return rest
      }

      // No icon and no colorIndex — assign the lowest available
      if (!hasIcon && !Number.isInteger(ws.colorIndex)) {
        let i = 0
        while (used.has(i)) i++
        used.add(i)
        needsSave = true
        return { ...ws, colorIndex: i }
      }

      return ws
    })

    if (needsSave) writeSettings(settings)
    return settings
  })
  ipcMain.handle('settings:write', (_, settings) => writeSettings(settings))

  // IPC: file browser
  let lastBrowseDir = null

  ipcMain.handle('dialog:openPath', async (_, options) => {
    const isFolder = !!options?.folder
    const isImage = !!options?.image
    const dialogOptions = {
      properties: isFolder ? ['openDirectory'] : ['openFile']
    }
    if (lastBrowseDir) dialogOptions.defaultPath = lastBrowseDir
    if (!isFolder) {
      dialogOptions.filters = isImage
        ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'ico', 'svg', 'webp'] }]
        : [{ name: 'VS Code Workspace', extensions: ['code-workspace'] }]
    }
    const result = await dialog.showOpenDialog(dialogOptions)
    if (!result.canceled) {
      const selected = result.filePaths[0]
      // For folders, remember the parent so the next browse starts one level up.
      // For files, remember the containing directory.
      lastBrowseDir = dirname(selected)
      return selected
    }
    return null
  })

  // IPC: load a display icon as a base64 data URL (PNG preferred over ICO).
  // CSS hue-rotate filter handles the no-icon fallback in the renderer.
  ipcMain.handle('workspace:resolveIcon', (_, workspace) => {
    const iconPath = resolveDisplayIcon(workspace)
    if (!iconPath) return null
    try {
      const data = readFileSync(iconPath)
      const ext = extname(iconPath).slice(1).toLowerCase()
      const mime =
        ext === 'ico' ? 'image/x-icon' :
        ext === 'svg' ? 'image/svg+xml' :
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        `image/${ext}`
      return `data:${mime};base64,${data.toString('base64')}`
    } catch {
      return null
    }
  })

  // IPC: launch workspace
  ipcMain.handle('workspace:launch', (_, workspace, parentWorkspace) => {
    return launchWorkspace(workspace, parentWorkspace)
  })

  createWindow()
  if (!is.dev) initUpdater(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
