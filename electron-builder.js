'use strict'
const path = require('path')
const { build: config } = require('./package.json')

module.exports = {
  ...config,
  win: {
    ...config.win,
    // No-op sign function — bypasses the built-in signing path so winCodeSign
    // is never downloaded (its archive contains macOS symlinks that Windows
    // can't extract without Developer Mode / elevated privileges).
    sign: async () => {}
  },
  // electron-builder's bundled rcedit (used to stamp the app icon) also comes
  // from winCodeSign, so we set the icon ourselves via the rcedit npm package.
  afterPack: async (context) => {
    if (context.packager.platform.name !== 'windows') return
    const rcedit = require('rcedit')
    const exePath = path.join(context.appOutDir, 'Codespace Launcher.exe')
    const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico')
    await rcedit(exePath, { icon: iconPath })
  }
}
