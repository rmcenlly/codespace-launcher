import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { setShowOnStart } from './settings'

export function initUpdater(mainWindow) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.logger = null

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('updater:update-available', {
      version: info.version,
      releaseDate: info.releaseDate
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('updater:download-progress', {
      percent: Math.round(progress.percent)
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('updater:update-downloaded')
  })

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('updater:error', err.message)
  })

  ipcMain.handle('updater:start-download', () => autoUpdater.downloadUpdate())
  ipcMain.handle('updater:quit-and-install', () => {
    // isSilent=true: skip NSIS UI on update (settings are preserved in %APPDATA%)
    // isForceRunAfter=true: app relaunches after install
    setShowOnStart()
    autoUpdater.quitAndInstall(true, true)
  })

  // Check ~3s after launch so the window is settled
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000)
}
