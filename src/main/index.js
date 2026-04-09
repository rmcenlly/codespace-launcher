import { app, shell, BrowserWindow, Tray, Menu, ipcMain, dialog } from 'electron'
import { join, extname, dirname } from 'path'
import { initUpdater } from './updater'
import { readFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readSettings, writeSettings, checkAndClearShowOnStart } from './settings'
import { launchWorkspace, resolveDisplayIcon } from './stub-manager'

const iconPath = is.dev
  ? join(__dirname, '../../build/icon.ico')
  : join(process.resourcesPath, 'icon.ico')

let mainWindow = null
let tray = null
let quitting = false

function createWindow() {
  mainWindow = new BrowserWindow({
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

  // Hide to tray on close instead of destroying
  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

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

function createTray() {
  tray = new Tray(iconPath)
  tray.setToolTip('Codespace Launcher')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        quitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
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
    const currentSettings = readSettings()
    if (currentSettings.defaultDirectory) {
      dialogOptions.defaultPath = currentSettings.defaultDirectory
    } else if (lastBrowseDir) {
      dialogOptions.defaultPath = lastBrowseDir
    }
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

  // IPC: raw showOpenDialog passthrough
  ipcMain.handle('dialog:showOpenDialog', (_, options) => {
    const merged = { ...options }
    if (!merged.defaultPath) {
      const currentSettings = readSettings()
      if (currentSettings.defaultDirectory) {
        merged.defaultPath = currentSettings.defaultDirectory
      } else if (lastBrowseDir) {
        merged.defaultPath = lastBrowseDir
      }
    }
    return dialog.showOpenDialog(merged)
  })

  // IPC: raw showOpenDialog passthrough
  ipcMain.handle('dialog:showOpenDialogSync', (_, options) => {
    return dialog.showOpenDialogSync(options)
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
    const result = launchWorkspace(workspace, parentWorkspace)
    if (readSettings().closeLauncherOnOpen) mainWindow.hide()
    return result
  })

  createWindow()
  createTray()
  if (!is.dev) initUpdater(mainWindow)

  // After an update-triggered restart, show the window automatically
  if (checkAndClearShowOnStart()) {
    mainWindow.once('ready-to-show', () => {
      mainWindow.show()
      mainWindow.focus()
    })
  }
})

// Keep the app alive when the window is closed — tray keeps it running
app.on('window-all-closed', () => {})
