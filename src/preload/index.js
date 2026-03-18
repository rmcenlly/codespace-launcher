import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  settings: {
    read: () => ipcRenderer.invoke('settings:read'),
    write: (settings) => ipcRenderer.invoke('settings:write', settings)
  },
  dialog: {
    openPath: (options) => ipcRenderer.invoke('dialog:openPath', options)
  },
  workspace: {
    resolveIcon: (workspace) => ipcRenderer.invoke('workspace:resolveIcon', workspace),
    launch: (workspace, parentWorkspace) =>
      ipcRenderer.invoke('workspace:launch', workspace, parentWorkspace)
  },
  updater: {
    onUpdateAvailable:  (cb) => ipcRenderer.on('updater:update-available',  (_e, info) => cb(info)),
    onDownloadProgress: (cb) => ipcRenderer.on('updater:download-progress', (_e, data) => cb(data)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('updater:update-downloaded', () => cb()),
    onError:            (cb) => ipcRenderer.on('updater:error', (_e, msg) => cb(msg)),
    startDownload:      () => ipcRenderer.invoke('updater:start-download'),
    quitAndInstall:     () => ipcRenderer.invoke('updater:quit-and-install'),
    removeAllListeners: () => [
      'updater:update-available', 'updater:download-progress',
      'updater:update-downloaded', 'updater:error'
    ].forEach((ch) => ipcRenderer.removeAllListeners(ch))
  }
})
